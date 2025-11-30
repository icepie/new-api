package controller

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type wechatLoginResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    string `json:"data"`
}

func getWeChatIdByCode(code string) (string, error) {
	if code == "" {
		return "", errors.New("无效的参数")
	}
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/api/wechat/user?code=%s", common.WeChatServerAddress, code), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", common.WeChatServerToken)
	client := http.Client{
		Timeout: 5 * time.Second,
	}
	httpResponse, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer httpResponse.Body.Close()
	var res wechatLoginResponse
	err = json.NewDecoder(httpResponse.Body).Decode(&res)
	if err != nil {
		return "", err
	}
	if !res.Success {
		return "", errors.New(res.Message)
	}
	if res.Data == "" {
		return "", errors.New("验证码错误或已过期")
	}
	return res.Data, nil
}

func WeChatAuth(c *gin.Context) {
	if !common.WeChatAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "管理员未开启通过微信登录以及注册",
			"success": false,
		})
		return
	}
	code := c.Query("code")
	wechatId, err := getWeChatIdByCode(code)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": err.Error(),
			"success": false,
		})
		return
	}
	user := model.User{
		WeChatId: wechatId,
	}
	if model.IsWeChatIdAlreadyTaken(wechatId) {
		err := user.FillUserByWeChatId()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
		if user.Id == 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "用户已注销",
			})
			return
		}
	} else {
		if common.RegisterEnabled {
			user.Username = "wechat_" + strconv.Itoa(model.GetMaxUserId()+1)
			user.DisplayName = "WeChat User"
			user.Role = common.RoleCommonUser
			user.Status = common.UserStatusEnabled

			if err := user.Insert(0); err != nil {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": err.Error(),
				})
				return
			}
		} else {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "管理员关闭了新用户注册",
			})
			return
		}
	}

	if user.Status != common.UserStatusEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "用户已被封禁",
			"success": false,
		})
		return
	}
	setupLogin(&user, c)
}

func WeChatBind(c *gin.Context) {
	if !common.WeChatAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "管理员未开启通过微信登录以及注册",
			"success": false,
		})
		return
	}
	code := c.Query("code")
	wechatId, err := getWeChatIdByCode(code)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": err.Error(),
			"success": false,
		})
		return
	}
	if model.IsWeChatIdAlreadyTaken(wechatId) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "该微信账号已被绑定",
		})
		return
	}
	session := sessions.Default(c)
	id := session.Get("id")
	user := model.User{
		Id: id.(int),
	}
	err = user.FillUserById()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	user.WeChatId = wechatId
	err = user.Update(false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
		})
}

// 微信 access_token 响应结构
type wechatAccessTokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	Errcode     int    `json:"errcode"`
	Errmsg      string `json:"errmsg"`
}

// 微信二维码创建请求结构
type wechatQRCodeRequest struct {
	ActionName string `json:"action_name"`
	ActionInfo struct {
		Scene struct {
			SceneID int `json:"scene_id"`
		} `json:"scene"`
	} `json:"action_info"`
}

// 微信二维码创建响应结构
type wechatQRCodeResponse struct {
	Ticket   string `json:"ticket"`
	ExpireSeconds int `json:"expire_seconds"`
	URL      string `json:"url"`
	Errcode  int    `json:"errcode"`
	Errmsg   string `json:"errmsg"`
}

// getWeChatAccessToken 获取微信 access_token（带缓存）
func getWeChatAccessToken() (string, error) {
	if common.WeChatAppID == "" || common.WeChatAppSecret == "" {
		return "", errors.New("微信 AppID 或 AppSecret 未配置")
	}

	// 先尝试从 Redis 获取缓存的 access_token
	if common.RedisEnabled {
		cachedToken, err := common.RedisGet("wechat_access_token")
		if err == nil && cachedToken != "" {
			return cachedToken, nil
		}
	}

	// 从微信 API 获取新的 access_token
	tokenURL := fmt.Sprintf("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s",
		common.WeChatAppID, common.WeChatAppSecret)

	client := http.Client{
		Timeout: 10 * time.Second,
	}
	resp, err := client.Get(tokenURL)
	if err != nil {
		return "", fmt.Errorf("获取 access_token 失败: %v", err)
	}
	defer resp.Body.Close()

	var tokenResp wechatAccessTokenResponse
	err = json.NewDecoder(resp.Body).Decode(&tokenResp)
	if err != nil {
		return "", fmt.Errorf("解析 access_token 响应失败: %v", err)
	}

	if tokenResp.Errcode != 0 {
		return "", fmt.Errorf("微信 API 错误: %s (code: %d)", tokenResp.Errmsg, tokenResp.Errcode)
	}

	// 缓存 access_token（2小时，但实际有效期可能是7200秒，我们缓存2小时）
	if common.RedisEnabled {
		expiration := 2 * time.Hour
		if tokenResp.ExpiresIn > 0 {
			// 使用实际过期时间，但提前5分钟过期以确保安全
			expiration = time.Duration(tokenResp.ExpiresIn-300) * time.Second
		}
		_ = common.RedisSet("wechat_access_token", tokenResp.AccessToken, expiration)
	}

	return tokenResp.AccessToken, nil
}

// generateWeChatQRCode 生成微信二维码 ticket
func generateWeChatQRCode() (string, int, error) {
	accessToken, err := getWeChatAccessToken()
	if err != nil {
		return "", 0, err
	}

	// 生成随机 scene_id（9位数字）
	rand.Seed(time.Now().UnixNano())
	sceneID := rand.Intn(900000000) + 100000000 // 100000000-999999999

	// 创建二维码
	qrURL := fmt.Sprintf("https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=%s", accessToken)
	
	reqData := wechatQRCodeRequest{
		ActionName: "QR_SCENE",
	}
	reqData.ActionInfo.Scene.SceneID = sceneID

	jsonData, err := json.Marshal(reqData)
	if err != nil {
		return "", 0, fmt.Errorf("序列化请求数据失败: %v", err)
	}

	client := http.Client{
		Timeout: 10 * time.Second,
	}
	resp, err := client.Post(qrURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", 0, fmt.Errorf("创建二维码失败: %v", err)
	}
	defer resp.Body.Close()

	var qrResp wechatQRCodeResponse
	err = json.NewDecoder(resp.Body).Decode(&qrResp)
	if err != nil {
		return "", 0, fmt.Errorf("解析二维码响应失败: %v", err)
	}

	if qrResp.Errcode != 0 {
		return "", 0, fmt.Errorf("微信 API 错误: %s (code: %d)", qrResp.Errmsg, qrResp.Errcode)
	}

	// 存储 ticket 和 scene_id 到 Redis（3分钟过期）
	if common.RedisEnabled {
		ticketKey := fmt.Sprintf("wechat_qr_ticket:%s", qrResp.Ticket)
		_ = common.RedisSet(ticketKey, strconv.Itoa(sceneID), 3*time.Minute)
	}

	return qrResp.Ticket, sceneID, nil
}

// WeChatQRCodeLogin 获取微信二维码登录接口
func WeChatQRCodeLogin(c *gin.Context) {
	if !common.WeChatAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "管理员未开启通过微信登录以及注册",
			"success": false,
		})
		return
	}

	if common.WeChatAppID == "" || common.WeChatAppSecret == "" {
		c.JSON(http.StatusOK, gin.H{
			"message": "微信 AppID 或 AppSecret 未配置",
			"success": false,
		})
		return
	}

	ticket, _, err := generateWeChatQRCode()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("生成二维码失败: %v", err),
			"success": false,
		})
		return
	}

	// 生成二维码 URL
	qrCodeURL := fmt.Sprintf("https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=%s", url.QueryEscape(ticket))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取二维码成功",
		"data": gin.H{
			"qr_code_url": qrCodeURL,
			"ticket":      ticket,
		},
	})
}

// 微信 XML 消息结构
type wechatXMLMessage struct {
	XMLName      xml.Name `xml:"xml"`
	ToUserName   string   `xml:"ToUserName"`
	FromUserName string   `xml:"FromUserName"`
	CreateTime   int64    `xml:"CreateTime"`
	MsgType      string   `xml:"MsgType"`
	Event        string   `xml:"Event"`
	EventKey     string   `xml:"EventKey"`
	Ticket       string   `xml:"Ticket"`
}

// parseWeChatXML 解析微信回调 XML
func parseWeChatXML(body []byte) (*wechatXMLMessage, error) {
	var msg wechatXMLMessage
	err := xml.Unmarshal(body, &msg)
	if err != nil {
		return nil, fmt.Errorf("解析 XML 失败: %v", err)
	}
	return &msg, nil
}

// WeChatQRCallback 微信服务器回调接口
func WeChatQRCallback(c *gin.Context) {
	// 读取请求体
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.String(http.StatusBadRequest, "读取请求体失败")
		return
	}

	// 解析 XML
	msg, err := parseWeChatXML(body)
	if err != nil {
		c.String(http.StatusBadRequest, "解析 XML 失败")
		return
	}

	// 只处理事件类型
	if msg.MsgType != "event" {
		c.String(http.StatusOK, "success")
		return
	}

	// 只处理 SCAN（已关注用户扫码）和 subscribe（新关注用户扫码）事件
	if msg.Event != "SCAN" && msg.Event != "subscribe" {
		c.String(http.StatusOK, "success")
		return
	}

	openid := msg.FromUserName
	ticket := msg.Ticket
	eventKey := msg.EventKey

	// 验证 ticket 是否有效
	if !common.RedisEnabled {
		c.String(http.StatusInternalServerError, "Redis 未启用")
		return
	}

	ticketKey := fmt.Sprintf("wechat_qr_ticket:%s", ticket)
	sceneIDStr, err := common.RedisGet(ticketKey)
	if err != nil {
		// ticket 不存在或已过期
		c.String(http.StatusOK, "success")
		return
	}

	// 验证 scene_id
	// 对于已关注用户，EventKey 就是 scene_id
	// 对于新关注用户，EventKey 可能是 "qrscene_{scene_id}" 格式
	sceneIDValid := false
	if msg.Event == "SCAN" {
		// 已关注用户，EventKey 直接是 scene_id
		sceneIDValid = eventKey == sceneIDStr
	} else if msg.Event == "subscribe" {
		// 新关注用户，EventKey 可能是 "qrscene_{scene_id}" 或直接是 scene_id
		sceneIDValid = eventKey == sceneIDStr || strings.HasSuffix(eventKey, sceneIDStr)
	}

	if !sceneIDValid {
		c.String(http.StatusOK, "success")
		return
	}

	// 检查用户是否存在
	user := model.User{
		WeChatId: openid,
	}
	userExists := model.IsWeChatIdAlreadyTaken(openid)

	var resultData map[string]interface{}

	if userExists {
		// 已有账号，直接登录
		err := user.FillUserByWeChatId()
		if err == nil && user.Id > 0 {
			// 生成临时 token（用于前端轮询获取）
			tempToken := fmt.Sprintf("%d_%d", user.Id, time.Now().Unix())
			resultData = map[string]interface{}{
				"user_id": user.Id,
				"token":   tempToken,
			}
		} else {
			// 用户查询失败，返回空
			c.String(http.StatusOK, "success")
			return
		}
	} else {
		// 新用户，生成临时 token
		tempToken := fmt.Sprintf("temp_%s_%d", openid, time.Now().Unix())
		// 存储 openid 到 Redis（5分钟过期）
		tempTokenKey := fmt.Sprintf("wechat_temp_token:%s", tempToken)
		_ = common.RedisSet(tempTokenKey, openid, 5*time.Minute)
		resultData = map[string]interface{}{
			"wechat_temp_token": tempToken,
		}
	}

	// 存储结果到 Redis（3分钟过期）
	successKey := fmt.Sprintf("wechat_qr_success:%s", ticket)
	resultJSON, _ := json.Marshal(resultData)
	_ = common.RedisSet(successKey, string(resultJSON), 3*time.Minute)

	// 返回成功响应给微信
	c.String(http.StatusOK, "success")
}

// WeChatQRStatus 查询扫码状态接口
func WeChatQRStatus(c *gin.Context) {
	ticket := c.Query("ticket")
	if ticket == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "ticket 参数缺失",
		})
		return
	}

	if !common.RedisEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Redis 未启用",
		})
		return
	}

	// 检查 ticket 是否过期
	ticketKey := fmt.Sprintf("wechat_qr_ticket:%s", ticket)
	_, err := common.RedisGet(ticketKey)
	if err != nil {
		// ticket 不存在或已过期
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "二维码已过期",
		})
		return
	}

	// 查询扫码结果
	successKey := fmt.Sprintf("wechat_qr_success:%s", ticket)
	resultJSON, err := common.RedisGet(successKey)
	if err != nil {
		// 尚未扫码
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "无数据",
			"data":    nil,
		})
		return
	}

	// 解析结果
	var resultData map[string]interface{}
	err = json.Unmarshal([]byte(resultJSON), &resultData)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "解析数据失败",
		})
		return
	}

	// 检查是否有用户 ID（老用户）
	if userID, ok := resultData["user_id"].(float64); ok {
		// 老用户，返回用户信息
		user := model.User{
			Id: int(userID),
		}
		err := user.FillUserById()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "用户不存在",
			})
			return
		}

		if user.Status != common.UserStatusEnabled {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "用户已被封禁",
			})
			return
		}

		// 老用户，设置 session 并返回用户信息
		setupLogin(&user, c)
		return
	}

	// 检查是否有临时 token（新用户）
	if tempToken, ok := resultData["wechat_temp_token"].(string); ok {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "请选择是否绑定已有账号",
			"data": gin.H{
				"wechat_temp_token": tempToken,
			},
		})
		return
	}

	// 数据格式异常
	c.JSON(http.StatusOK, gin.H{
		"success": false,
		"message": "数据格式异常",
	})
}

// WeChatQRBindRequest 微信绑定请求结构
type WeChatQRBindRequest struct {
	WechatTempToken string `json:"wechat_temp_token"`
	IsBind          bool   `json:"is_bind"` // true: 绑定已有账号, false: 创建新账号
}

// WeChatQRBind 新用户绑定/登录接口
func WeChatQRBind(c *gin.Context) {
	if !common.WeChatAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "管理员未开启通过微信登录以及注册",
			"success": false,
		})
		return
	}

	var req WeChatQRBindRequest
	err := json.NewDecoder(c.Request.Body).Decode(&req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "无效的参数",
			"success": false,
		})
		return
	}

	if req.WechatTempToken == "" {
		c.JSON(http.StatusOK, gin.H{
			"message": "wechat_temp_token 参数缺失",
			"success": false,
		})
		return
	}

	if !common.RedisEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "Redis 未启用",
			"success": false,
		})
		return
	}

	// 从 Redis 获取 openid
	tempTokenKey := fmt.Sprintf("wechat_temp_token:%s", req.WechatTempToken)
	openid, err := common.RedisGet(tempTokenKey)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "临时 token 已过期，请重新扫码",
			"success": false,
		})
		return
	}

	var user model.User

	if req.IsBind {
		// 绑定已有账号
		session := sessions.Default(c)
		userID := session.Get("id")
		if userID == nil {
			c.JSON(http.StatusOK, gin.H{
				"message": "请先登录",
				"success": false,
			})
			return
		}

		// 检查该微信账号是否已被绑定
		if model.IsWeChatIdAlreadyTaken(openid) {
			c.JSON(http.StatusOK, gin.H{
				"message": "该微信账号已被绑定",
				"success": false,
			})
			return
		}

		// 绑定到当前用户
		user = model.User{
			Id: userID.(int),
		}
		err = user.FillUserById()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"message": "用户不存在",
				"success": false,
			})
			return
		}

		user.WeChatId = openid
		err = user.Update(false)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"message": err.Error(),
				"success": false,
			})
			return
		}

		// 删除临时 token
		_ = common.RedisDel(tempTokenKey)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "绑定成功",
		})
		return
	} else {
		// 创建新账号
		if !common.RegisterEnabled {
			c.JSON(http.StatusOK, gin.H{
				"message": "管理员关闭了新用户注册",
				"success": false,
			})
			return
		}

		// 检查该微信账号是否已被使用
		if model.IsWeChatIdAlreadyTaken(openid) {
			c.JSON(http.StatusOK, gin.H{
				"message": "该微信账号已被使用",
				"success": false,
			})
			return
		}

		// 创建新用户
		user = model.User{
			WeChatId:    openid,
			Username:    "wechat_" + strconv.Itoa(model.GetMaxUserId()+1),
			DisplayName: "WeChat User",
			Role:        common.RoleCommonUser,
			Status:      common.UserStatusEnabled,
		}

		err = user.Insert(0)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"message": err.Error(),
				"success": false,
			})
			return
		}

		// 删除临时 token
		_ = common.RedisDel(tempTokenKey)

		// 直接登录
		setupLogin(&user, c)
		return
	}
}
