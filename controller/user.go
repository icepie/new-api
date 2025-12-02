package controller

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"gorm.io/gorm"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func Login(c *gin.Context) {
	if !common.PasswordLoginEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "管理员关闭了密码登录",
			"success": false,
		})
		return
	}
	var loginRequest LoginRequest
	err := json.NewDecoder(c.Request.Body).Decode(&loginRequest)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "无效的参数",
			"success": false,
		})
		return
	}
	username := loginRequest.Username
	password := loginRequest.Password
	if username == "" || password == "" {
		c.JSON(http.StatusOK, gin.H{
			"message": "无效的参数",
			"success": false,
		})
		return
	}
	user := model.User{
		Username: username,
		Password: password,
	}
	err = user.ValidateAndFill()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": err.Error(),
			"success": false,
		})
		return
	}

	// 检查是否启用2FA
	if model.IsTwoFAEnabled(user.Id) {
		// 设置pending session，等待2FA验证
		session := sessions.Default(c)
		session.Set("pending_username", user.Username)
		session.Set("pending_user_id", user.Id)
		err := session.Save()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"message": "无法保存会话信息，请重试",
				"success": false,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "请输入两步验证码",
			"success": true,
			"data": map[string]interface{}{
				"require_2fa": true,
			},
		})
		return
	}

	setupLogin(&user, c)
}

// callExternalLoginAPI 调用外部登录接口
// 返回: (是否成功, email, star_user_id, xtoken, 错误)
// 注意: password 参数应该是已经 base64 编码的密码（前端已编码）
func callExternalLoginAPI(username, password string) (bool, string, string, string, error) {
	// 使用配置的 Star 后端地址
	externalAPIURL := common.StarBackendAddress
	if !strings.HasSuffix(externalAPIURL, "/") {
		externalAPIURL += "/"
	}
	externalAPIURL += "u/login"

	// 前端已经对密码进行了 base64 编码，这里直接使用
	// 构建请求体
	requestBody := map[string]string{
		"email":    username, // 使用username作为email
		"password": password, // 前端已编码，直接使用
	}
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return false, "", "", "", fmt.Errorf("构建请求体失败: %w", err)
	}

	// 创建HTTP请求
	req, err := http.NewRequest("POST", externalAPIURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return false, "", "", "", fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/plain, */*")

	// 创建HTTP客户端
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// 发送请求
	resp, err := client.Do(req)
	if err != nil {
		return false, "", "", "", fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, "", "", "", fmt.Errorf("读取响应失败: %w", err)
	}

	// 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		return false, "", "", "", fmt.Errorf("外部API返回错误状态码: %d", resp.StatusCode)
	}

	// 解析响应
	var response map[string]interface{}
	if err := json.Unmarshal(body, &response); err != nil {
		return false, "", "", "", fmt.Errorf("解析响应失败: %w", err)
	}

	// 检查响应中的成功标志（根据实际API响应格式调整）
	// 假设响应格式为 {"code": 20000, "msg": "ok", "data": {...}}
	if code, ok := response["code"].(float64); ok {
		if code == 20000 {
			// 尝试从响应中获取email、star_user_id和xtoken
			email := ""
			starUserId := ""
			xtoken := ""
			if data, ok := response["data"].(map[string]interface{}); ok {
				if emailVal, ok := data["email"].(string); ok {
					email = emailVal
				}
				// 从 xuserid 字段获取 star_user_id（star_id）
				if xuseridVal, ok := data["xuserid"]; ok {
					starUserId = fmt.Sprintf("%v", xuseridVal)
				} else if idVal, ok := data["id"]; ok {
					// 兼容旧格式：尝试 id 字段
					starUserId = fmt.Sprintf("%v", idVal)
				} else if userIdVal, ok := data["user_id"]; ok {
					// 兼容旧格式：尝试 user_id 字段
					starUserId = fmt.Sprintf("%v", userIdVal)
				}
				// 获取 xtoken
				if xtokenVal, ok := data["xtoken"].(string); ok {
					xtoken = xtokenVal
				}
			}
			return true, email, starUserId, xtoken, nil
		} else {
			// code不是20000，登录失败
			msg := ""
			if msgVal, ok := response["msg"].(string); ok {
				msg = msgVal
			}
			return false, "", "", "", fmt.Errorf("外部API返回错误: code=%v, msg=%s", code, msg)
		}
	}

	// 如果响应中没有code字段，认为登录失败
	return false, "", "", "", fmt.Errorf("外部API响应格式异常，缺少code字段")
}

// StarUserInfo 存储从 Star 后端获取的用户信息
type StarUserInfo struct {
	Username          string `json:"username"`
	Email             string `json:"email"`
	Status            int    `json:"status"`
	InviterUser       string `json:"inviter_user"`
	CreatedAt         string `json:"created_at"`
	WechatOpenid      string `json:"wechat_openid"`
	UserActivePackages struct {
		PackageId   string `json:"package_id"`
		PackageName string `json:"package_name"`
		Level       string `json:"level"`
		Priority    string `json:"priority"`
		ExpiryDate  string `json:"expiry_date"`
	} `json:"user_active_packages"`
}

// callGetUserInfoAPI 调用外部获取用户信息接口
// 返回: (是否成功, 用户信息, 错误)
func callGetUserInfoAPI(xuserid, xtoken string) (bool, *StarUserInfo, error) {
	// 使用配置的 Star 后端地址
	externalAPIURL := common.StarBackendAddress
	if !strings.HasSuffix(externalAPIURL, "/") {
		externalAPIURL += "/"
	}
	externalAPIURL += "u/get_user_info"

	// 创建HTTP请求
	req, err := http.NewRequest("GET", externalAPIURL, nil)
	if err != nil {
		return false, nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Accept", "*/*")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("xuserid", xuserid)
	req.Header.Set("xtoken", xtoken)

	// 创建HTTP客户端
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// 发送请求
	resp, err := client.Do(req)
	if err != nil {
		return false, nil, fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, nil, fmt.Errorf("读取响应失败: %w", err)
	}

	// 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		return false, nil, fmt.Errorf("外部API返回错误状态码: %d", resp.StatusCode)
	}

	// 解析响应
	var response map[string]interface{}
	if err := json.Unmarshal(body, &response); err != nil {
		return false, nil, fmt.Errorf("解析响应失败: %w", err)
	}

	// 检查响应中的成功标志
	if code, ok := response["code"].(float64); ok {
		if code == 20000 {
			// 解析用户信息
			var userInfo StarUserInfo
			if data, ok := response["data"].(map[string]interface{}); ok {
				// 将 data 转换为 JSON 再解析，确保类型正确
				dataBytes, err := json.Marshal(data)
				if err != nil {
					return false, nil, fmt.Errorf("序列化用户信息失败: %w", err)
				}
				if err := json.Unmarshal(dataBytes, &userInfo); err != nil {
					return false, nil, fmt.Errorf("解析用户信息失败: %w", err)
				}
				// Star 后端的 get_user_info 可能不返回 wechat_openid，需要从原始数据中提取
				// 如果 data 中有 wechat_openid，直接使用；否则保持为空（会在后续从数据库更新）
				if wechatOpenid, ok := data["wechat_openid"].(string); ok && wechatOpenid != "" {
					userInfo.WechatOpenid = wechatOpenid
				}
				return true, &userInfo, nil
			}
			return false, nil, fmt.Errorf("响应中缺少data字段")
		} else {
			// code不是20000，获取失败
			msg := ""
			if msgVal, ok := response["msg"].(string); ok {
				msg = msgVal
			}
			return false, nil, fmt.Errorf("外部API返回错误: code=%v, msg=%s", code, msg)
		}
	}

	// 如果响应中没有code字段，认为获取失败
	return false, nil, fmt.Errorf("外部API响应格式异常，缺少code字段")
}

// callStarBackendAPI 通用函数：调用 Star 后端 API
// method: HTTP 方法 (GET, POST 等)
// endpoint: API 端点 (如 "u/register")
// requestBody: 请求体 (POST/PUT 时使用，nil 表示无请求体)
// headers: 额外的请求头
// 返回: (响应数据, 错误)
func callStarBackendAPI(method, endpoint string, requestBody map[string]interface{}, headers map[string]string) (map[string]interface{}, error) {
	// 使用配置的 Star 后端地址
	externalAPIURL := common.StarBackendAddress
	if !strings.HasSuffix(externalAPIURL, "/") {
		externalAPIURL += "/"
	}
	externalAPIURL += endpoint

	var req *http.Request
	var err error

	if requestBody != nil {
		jsonData, err := json.Marshal(requestBody)
		if err != nil {
			return nil, fmt.Errorf("构建请求体失败: %w", err)
		}
		req, err = http.NewRequest(method, externalAPIURL, bytes.NewBuffer(jsonData))
	} else {
		req, err = http.NewRequest(method, externalAPIURL, nil)
	}
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/plain, */*")

	// 添加额外的请求头
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	// 创建HTTP客户端
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// 发送请求
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	// 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("外部API返回错误状态码: %d, body: %s", resp.StatusCode, string(body))
	}

	// 解析响应
	var response map[string]interface{}
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	return response, nil
}

// StarLogin 登录接口 - 使用 Star 用户系统登录逻辑
func StarLogin(c *gin.Context) {
	if !common.StarUserSystemEnabled || common.StarBackendAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Star 用户系统未启用",
		})
		return
	}

	var request struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误: " + err.Error(),
		})
		return
	}

	username := request.Email
	password := request.Password

	// 先调用外部登录接口
	externalLoginSuccess, email, starUserId, xtoken, err := callExternalLoginAPI(username, password)
	if err != nil {
		common.SysLog(fmt.Sprintf("调用外部登录接口失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "外部登录验证失败: " + err.Error(),
		})
		return
	}

	if !externalLoginSuccess {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户名或密码错误",
		})
		return
	}

	// 外部登录成功，检查本地是否存在用户
	// 使用email查找用户，如果username是email格式则使用username，否则使用从外部API获取的email
	userEmail := username
	if !strings.Contains(username, "@") && email != "" {
		userEmail = email
	}

	var user model.User
	err = model.DB.Where("email = ? OR username = ?", userEmail, username).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 用户不存在，先尝试获取 Star 用户信息
			var starUserInfo *StarUserInfo
			if starUserId != "" && xtoken != "" {
				success, info, err := callGetUserInfoAPI(starUserId, xtoken)
				if err != nil {
					common.SysLog(fmt.Sprintf("获取 Star 用户信息失败: %v", err))
				} else if success && info != nil {
					starUserInfo = info
				}
			}

			// 使用 Star 系统的密码（base64 解码后使用）
			// 注意：password 参数是 base64 编码的，需要先解码
			var userPassword string
			if password != "" {
				// 解码 base64 密码
				decodedPassword, err := base64.StdEncoding.DecodeString(password)
				if err == nil {
					userPassword = string(decodedPassword)
					common.SysLog(fmt.Sprintf("使用 Star 系统密码创建新用户"))
				} else {
					// 如果解码失败，生成随机密码作为后备
					common.SysLog(fmt.Sprintf("密码 base64 解码失败，使用随机密码: %v", err))
					randomPassword, err := common.GenerateRandomCharsKey(32)
					if err != nil {
						common.SysLog(fmt.Sprintf("生成默认密码失败: %v", err))
						c.JSON(http.StatusOK, gin.H{
							"success": false,
							"message": "系统错误，请稍后重试",
						})
						return
					}
					userPassword = randomPassword
				}
			} else {
				// 如果没有密码，生成随机密码
				randomPassword, err := common.GenerateRandomCharsKey(32)
				if err != nil {
					common.SysLog(fmt.Sprintf("生成默认密码失败: %v", err))
					c.JSON(http.StatusOK, gin.H{
						"success": false,
						"message": "系统错误，请稍后重试",
					})
					return
				}
				userPassword = randomPassword
			}

			// 参考原版 Register 逻辑：获取 aff 参数并转换为邀请人ID（只有在创建新用户时才处理）
			affCode := c.Query("aff")
			inviterId, _ := model.GetUserIdByAffCode(affCode) // 参考原版：affCode 是邀请人的码，不是用户自己的码
			common.SysLog(fmt.Sprintf("注册流程: affCode=%s, inviterId=%d", affCode, inviterId))

			// 创建新用户，优先使用从 Star 获取的信息（参考原版 Register 逻辑）
			newUser := model.User{
				Password:    userPassword,
				Role:        common.RoleCommonUser,
				Status:      common.UserStatusEnabled,
				InviterId:   inviterId, // 参考原版：直接设置 InviterId
			}
			common.SysLog(fmt.Sprintf("准备创建新用户: InviterId=%d, 初始Role=%s, 状态=%d", newUser.InviterId, newUser.Role, newUser.Status))

			// 使用 Star 用户信息（如果可用）
			if starUserInfo != nil {
				if starUserInfo.Username != "" {
					newUser.Username = starUserInfo.Username
					newUser.DisplayName = starUserInfo.Username
				} else {
					newUser.Username = username
					newUser.DisplayName = username
				}
				if starUserInfo.Email != "" {
					newUser.Email = starUserInfo.Email
				} else if strings.Contains(username, "@") {
					newUser.Email = username
				} else if email != "" {
					newUser.Email = email
				}
				if starUserInfo.WechatOpenid != "" {
					newUser.WeChatId = starUserInfo.WechatOpenid
				}
				// 根据 Star 系统的状态设置用户状态
				if starUserInfo.Status == 0 {
					newUser.Status = common.UserStatusDisabled
				}
			} else {
				// 没有 Star 用户信息，使用原有逻辑
				newUser.Username = username
				newUser.DisplayName = username
				if strings.Contains(username, "@") {
					newUser.Email = username
				} else if email != "" {
					newUser.Email = email
				}
			}

			// 检查是否是第一个绑定的 star 用户
			if starUserId != "" {
				var count int64
				err = model.DB.Model(&model.User{}).Where("star_user_id != ? AND star_user_id != ?", "", "0").Count(&count).Error
				if err != nil {
					common.SysLog(fmt.Sprintf("检查 star 用户数量失败: %v", err))
				} else {
					// 如果是第一个绑定的 star 用户，设置为 root 用户
					if count == 0 {
						newUser.Role = common.RoleRootUser
						common.SysLog(fmt.Sprintf("第一个 Star 用户 %s (star_user_id: %s) 被设置为 root 用户", newUser.Username, starUserId))
					}
				}
				newUser.StarUserId = starUserId
			}

			// 插入用户（传入 inviterId 以处理邀请关系，参考原版 Register 逻辑）
			if err := newUser.Insert(inviterId); err != nil {
				common.SysLog(fmt.Sprintf("自动注册用户失败: %v", err))
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "自动注册失败，请稍后重试",
				})
				return
			}

			// 重新获取创建的用户
			err = model.DB.Where("email = ? OR username = ?", newUser.Email, newUser.Username).First(&user).Error
			if err != nil {
				common.SysLog(fmt.Sprintf("获取新创建用户失败: %v", err))
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "用户创建成功但登录失败，请稍后重试",
				})
				return
			}
		} else {
			// 其他数据库错误
			common.SysLog(fmt.Sprintf("查询用户失败: %v", err))
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "数据库错误，请稍后重试",
			})
			return
		}
	}

	// 检查用户状态
	if user.Status != common.UserStatusEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户已被封禁",
		})
		return
	}

	// 绑定 star_user_id（如果用户已存在但还没有绑定）
	if starUserId != "" && user.StarUserId == "" {
		// 检查是否是第一个绑定的 star 用户
		var count int64
		err = model.DB.Model(&model.User{}).Where("star_user_id != ? AND star_user_id != ?", "", "0").Count(&count).Error
		if err != nil {
			common.SysLog(fmt.Sprintf("检查 star 用户数量失败: %v", err))
		} else {
			// 如果是第一个绑定的 star 用户，设置为 root 用户
			if count == 0 {
				user.Role = common.RoleRootUser
				common.SysLog(fmt.Sprintf("第一个 Star 用户 %s (star_user_id: %s) 被设置为 root 用户", user.Username, starUserId))
			}
		}

		// 更新 star_user_id
		updates := map[string]interface{}{
			"star_user_id": starUserId,
		}
		if user.Role == common.RoleRootUser {
			updates["role"] = common.RoleRootUser
		}
		if err := model.DB.Model(&user).Updates(updates).Error; err != nil {
			common.SysLog(fmt.Sprintf("更新 star_user_id 失败: %v", err))
		} else {
			// 重新获取用户以获取最新信息
			model.DB.Where("id = ?", user.Id).First(&user)
		}
	}

	// 更新用户信息（包括密码同步）
	updates := map[string]interface{}{}
	
	// 如果有 star_user_id 和 xtoken，获取并更新用户信息
	if starUserId != "" && xtoken != "" {
		success, starUserInfo, err := callGetUserInfoAPI(starUserId, xtoken)
		if err != nil {
			common.SysLog(fmt.Sprintf("获取 Star 用户信息失败: %v", err))
		} else if success && starUserInfo != nil {
			// 更新用户名（如果不同）
			if starUserInfo.Username != "" && starUserInfo.Username != user.Username {
				updates["username"] = starUserInfo.Username
				updates["display_name"] = starUserInfo.Username
			}
			
			// 更新邮箱（如果不同且不为空）
			if starUserInfo.Email != "" && starUserInfo.Email != user.Email {
				updates["email"] = starUserInfo.Email
			}
			
			// 更新微信ID（如果不同且不为空）
			if starUserInfo.WechatOpenid != "" && starUserInfo.WechatOpenid != user.WeChatId {
				updates["wechat_id"] = starUserInfo.WechatOpenid
			}
			
			// 更新状态（根据 Star 系统的状态）
			if starUserInfo.Status == 0 && user.Status == common.UserStatusEnabled {
				updates["status"] = common.UserStatusDisabled
			} else if starUserInfo.Status == 1 && user.Status == common.UserStatusDisabled {
				updates["status"] = common.UserStatusEnabled
			}
		}
	}
	
	// 同步密码：使用 Star 登录时传入的密码（base64 解码后哈希）
	// 注意：password 参数是 base64 编码的，需要先解码
	// 无论是否获取到 starUserInfo，都同步密码
	if password != "" {
		// 解码 base64 密码
		decodedPassword, err := base64.StdEncoding.DecodeString(password)
		if err == nil {
			// 哈希化密码
			hashedPassword, err := common.Password2Hash(string(decodedPassword))
			if err == nil {
				updates["password"] = hashedPassword
				common.SysLog(fmt.Sprintf("同步用户 %s (star_user_id: %s) 的密码", user.Username, starUserId))
			} else {
				common.SysLog(fmt.Sprintf("密码哈希化失败: %v", err))
			}
		} else {
			common.SysLog(fmt.Sprintf("密码 base64 解码失败: %v", err))
		}
	}
	
	// 如果有更新，执行更新操作
	if len(updates) > 0 {
		if err := model.DB.Model(&user).Updates(updates).Error; err != nil {
			common.SysLog(fmt.Sprintf("更新用户信息失败: %v", err))
		} else {
			// 重新获取用户以获取最新信息
			model.DB.Where("id = ?", user.Id).First(&user)
			common.SysLog(fmt.Sprintf("成功更新用户 %s (star_user_id: %s) 的信息", user.Username, starUserId))
		}
	}

	// 设置 Star 认证 cookies（如果存在）
	// 注意：xy_uuid_token 需要从 callExternalLoginAPI 的响应中获取，这里暂时不设置
	if starUserId != "" && xtoken != "" {
		c.SetCookie("xuserid", starUserId, 60*60*24*3, "/", "", false, true) // 3天
		c.SetCookie("xtoken", xtoken, 60*60*24*3, "/", "", false, true)     // 3天
	}

	// 调用 setupLogin 设置会话并返回用户信息
	setupLogin(&user, c)
}

// StarRegister 注册接口 - 返回 new-api 格式
func StarRegister(c *gin.Context) {
	if !common.StarUserSystemEnabled || common.StarBackendAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Star 用户系统未启用",
		})
		return
	}

	var request struct {
		Email     string `json:"email" binding:"required"`
		Password  string `json:"password" binding:"required"`
		EmailCode string `json:"email_code" binding:"required"`
		Username  string `json:"username,omitempty"` // 可选用户名参数
		AffCode   string `json:"aff_code,omitempty"` // 可选邀请码参数
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误: " + err.Error(),
		})
		return
	}

	// 如果请求体中没有 aff_code，尝试从 URL 参数获取
	affCode := request.AffCode
	if affCode == "" {
		affCode = c.Query("aff")
	}

	// 调用 Star 后端注册接口
	response, err := callStarBackendAPI("POST", "u/register", map[string]interface{}{
		"email":      request.Email,
		"password":   request.Password,
		"email_code": request.EmailCode,
	}, nil)

	if err != nil {
		common.SysLog(fmt.Sprintf("调用 Star 注册接口失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "注册失败: " + err.Error(),
		})
		return
	}

	// 将 Star 后端的响应转换为 new-api 格式
	if code, ok := response["code"].(float64); ok {
		if code == 20000 {
			// 注册成功，在 new-api 中创建用户并处理邀请关系
			// 从注册响应中获取 xuserid 和 xtoken
			var xuserid string
			var xtoken string
			if data, ok := response["data"].(map[string]interface{}); ok {
				if xuseridVal, ok := data["xuserid"]; ok {
					xuserid = fmt.Sprintf("%v", xuseridVal)
				}
				if xtokenVal, ok := data["xtoken"].(string); ok {
					xtoken = xtokenVal
				}
			}

			// 检查用户是否已在 new-api 中存在
			var existingUser model.User
			err = model.DB.Where("email = ?", request.Email).First(&existingUser).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 用户不存在，创建新用户
				// 参考原版 Register 逻辑：获取 aff 码并转换为邀请人ID（只有在创建新用户时才处理）
				inviterId, _ := model.GetUserIdByAffCode(affCode) // 参考原版：affCode 是邀请人的码，不是用户自己的码
				common.SysLog(fmt.Sprintf("StarRegister 注册流程: affCode=%s, inviterId=%d", affCode, inviterId))
				// 获取 Star 用户信息
				var starUserInfo *StarUserInfo
				if xuserid != "" && xtoken != "" {
					success, info, err := callGetUserInfoAPI(xuserid, xtoken)
					if err != nil {
						common.SysLog(fmt.Sprintf("获取 Star 用户信息失败: %v", err))
					} else if success && info != nil {
						starUserInfo = info
					}
				}

				// 创建新用户（参考原版 Register 逻辑）
				newUser := model.User{
					Password:    "", // 使用空密码，因为使用 Star 系统认证
					Role:        common.RoleCommonUser,
					Status:      common.UserStatusEnabled,
					StarUserId:  xuserid,
					InviterId:   inviterId, // 参考原版：直接设置 InviterId
				}

				// 使用 Star 用户信息（如果可用）
				if starUserInfo != nil {
					if starUserInfo.Username != "" {
						newUser.Username = starUserInfo.Username
						newUser.DisplayName = starUserInfo.Username
					} else {
						newUser.Username = request.Email
						newUser.DisplayName = request.Email
					}
					if starUserInfo.Email != "" {
						newUser.Email = starUserInfo.Email
					} else {
						newUser.Email = request.Email
					}
					if starUserInfo.WechatOpenid != "" {
						newUser.WeChatId = starUserInfo.WechatOpenid
					}
					// 根据 Star 系统的状态设置用户状态
					if starUserInfo.Status == 0 {
						newUser.Status = common.UserStatusDisabled
					}
				} else {
					// 没有 Star 用户信息，使用请求中的邮箱
					newUser.Username = request.Email
					newUser.DisplayName = request.Email
					newUser.Email = request.Email
				}

				// 检查是否是第一个绑定的 star 用户
				if xuserid != "" {
					var count int64
					err = model.DB.Model(&model.User{}).Where("star_user_id != ? AND star_user_id != ?", "", "0").Count(&count).Error
					if err != nil {
						common.SysLog(fmt.Sprintf("检查 star 用户数量失败: %v", err))
					} else {
						// 如果是第一个绑定的 star 用户，设置为 root 用户
						if count == 0 {
							newUser.Role = common.RoleRootUser
							common.SysLog(fmt.Sprintf("第一个 Star 用户 %s (star_user_id: %s) 被设置为 root 用户", newUser.Username, xuserid))
						}
					}
				}

				// 插入用户（传入 inviterId 以处理邀请关系）
				if err := newUser.Insert(inviterId); err != nil {
					common.SysLog(fmt.Sprintf("创建 new-api 用户失败: %v", err))
					// 不影响 Star 注册成功，只记录日志
				} else {
					common.SysLog(fmt.Sprintf("成功创建 new-api 用户 %s (star_user_id: %s, inviter_id: %d)", newUser.Username, xuserid, inviterId))
				}
			} else if err == nil {
				// 用户已存在，只更新 star_user_id（参考原版 Register：已存在的用户不处理邀请关系）
				if xuserid != "" && existingUser.StarUserId == "" {
					updates := map[string]interface{}{
						"star_user_id": xuserid,
					}
					if err := model.DB.Model(&existingUser).Updates(updates).Error; err != nil {
						common.SysLog(fmt.Sprintf("更新用户 star_user_id 失败: %v", err))
					}
				}
			}

			// 如果提供了用户名，则调用更新用户名接口
			if request.Username != "" && strings.TrimSpace(request.Username) != "" {
				// 如果获取到了认证信息，调用更新用户名接口
				if xuserid != "" && xtoken != "" {
					headers := map[string]string{
						"xuserid": xuserid,
						"xtoken":  xtoken,
					}
					updateResponse, updateErr := callStarBackendAPI("POST", "u/change_user_info", map[string]interface{}{
						"change_type": "username",
						"username":    strings.TrimSpace(request.Username),
					}, headers)

					if updateErr != nil {
						common.SysLog(fmt.Sprintf("注册成功后更新用户名失败: %v", updateErr))
						// 用户名更新失败不影响注册成功，只记录日志
					} else if updateCode, ok := updateResponse["code"].(float64); ok {
						if updateCode == 20000 {
							common.SysLog(fmt.Sprintf("注册成功后成功更新用户名: %s", strings.TrimSpace(request.Username)))
						} else {
							updateMsg := ""
							if msgVal, ok := updateResponse["msg"].(string); ok {
								updateMsg = msgVal
							}
							common.SysLog(fmt.Sprintf("注册成功后更新用户名失败: code=%v, msg=%s", updateCode, updateMsg))
						}
					}
				} else {
					common.SysLog("注册响应中未找到认证信息，无法更新用户名")
				}
			}

			// 成功，转换为 new-api 格式
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "注册成功",
				"data":    response["data"],
			})
		} else {
			// 失败，转换为 new-api 格式
			msg := ""
			if msgVal, ok := response["msg"].(string); ok {
				msg = msgVal
			}
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": msg,
			})
		}
	} else {
		// 直接返回原响应
		c.JSON(http.StatusOK, response)
	}
}

// StarSendEmail 发送邮箱验证码接口 - 返回 new-api 格式
func StarSendEmail(c *gin.Context) {
	if !common.StarUserSystemEnabled || common.StarBackendAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Star 用户系统未启用",
		})
		return
	}

	var request struct {
		Email string `json:"email" binding:"required"`
		Type  string `json:"type_" binding:"required"` // register 或 back_password
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误: " + err.Error(),
		})
		return
	}

	// 调用 Star 后端发送邮箱验证码接口
	response, err := callStarBackendAPI("POST", "u/send_email", map[string]interface{}{
		"email": request.Email,
		"type_": request.Type,
	}, nil)

	if err != nil {
		common.SysLog(fmt.Sprintf("调用 Star 发送邮箱验证码接口失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "发送验证码失败: " + err.Error(),
		})
		return
	}

	// 将 Star 后端的响应转换为 new-api 格式
	if code, ok := response["code"].(float64); ok {
		if code == 20000 {
			// 成功，转换为 new-api 格式
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "验证码发送成功",
			})
		} else {
			// 失败，转换为 new-api 格式
			msg := ""
			if msgVal, ok := response["msg"].(string); ok {
				msg = msgVal
			}
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": msg,
			})
		}
	} else {
		// 直接返回原响应
		c.JSON(http.StatusOK, response)
	}
}

// StarBackPassword 找回密码接口 - 返回 new-api 格式
func StarBackPassword(c *gin.Context) {
	if !common.StarUserSystemEnabled || common.StarBackendAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Star 用户系统未启用",
		})
		return
	}

	var request struct {
		Email     string `json:"email" binding:"required"`
		Password  string `json:"password" binding:"required"`
		EmailCode string `json:"email_code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误: " + err.Error(),
		})
		return
	}

	// 调用 Star 后端找回密码接口
	response, err := callStarBackendAPI("POST", "u/back_password", map[string]interface{}{
		"email":      request.Email,
		"password":   request.Password,
		"email_code": request.EmailCode,
	}, nil)

	if err != nil {
		common.SysLog(fmt.Sprintf("调用 Star 找回密码接口失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "找回密码失败: " + err.Error(),
		})
		return
	}

	// 将 Star 后端的响应转换为 new-api 格式
	if code, ok := response["code"].(float64); ok {
		if code == 20000 {
			// 成功，转换为 new-api 格式
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "密码重置成功",
			})
		} else {
			// 失败，转换为 new-api 格式
			msg := ""
			if msgVal, ok := response["msg"].(string); ok {
				msg = msgVal
			}
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": msg,
			})
		}
	} else {
		// 直接返回原响应
		c.JSON(http.StatusOK, response)
	}
}

// StarWechatLoginQR 获取微信登录二维码接口 - 返回 new-api 格式
func StarWechatLoginQR(c *gin.Context) {
	if !common.StarUserSystemEnabled || common.StarBackendAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Star 用户系统未启用",
		})
		return
	}

	mode := c.Query("mode") // login 或 bind
	if mode == "" {
		mode = "login"
	}

	// 调用 Star 后端获取微信登录二维码接口
	endpoint := "u/wechat_login_qr"
	if mode != "" {
		endpoint += "?mode=" + url.QueryEscape(mode)
	}

	response, err := callStarBackendAPI("GET", endpoint, nil, nil)

	if err != nil {
		common.SysLog(fmt.Sprintf("调用 Star 获取微信登录二维码接口失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取二维码失败: " + err.Error(),
		})
		return
	}

	// 将 Star 后端的响应转换为 new-api 格式
	if code, ok := response["code"].(float64); ok {
		if code == 20000 {
			// 成功，转换为 new-api 格式
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "",
				"data":    response["data"],
			})
		} else {
			// 失败，转换为 new-api 格式
			msg := ""
			if msgVal, ok := response["msg"].(string); ok {
				msg = msgVal
			}
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": msg,
			})
		}
	} else {
		// 直接返回原响应
		c.JSON(http.StatusOK, response)
	}
}

// StarQRLoginStatus 检查微信二维码登录状态接口 - 在后端统一处理登录和绑定流程
func StarQRLoginStatus(c *gin.Context) {
	if !common.StarUserSystemEnabled || common.StarBackendAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Star 用户系统未启用",
		})
		return
	}

	ticket := c.Query("ticket")
	if ticket == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误: ticket 不能为空",
		})
		return
	}

	// 先调用 Star 后端检查微信二维码登录状态接口
	// 只有在 star 接口调用成功后才进行数据库操作
	endpoint := "u/qr_login_status?ticket=" + url.QueryEscape(ticket)
	response, err := callStarBackendAPI("GET", endpoint, nil, nil)

	if err != nil {
		common.SysLog(fmt.Sprintf("调用 Star 检查微信二维码登录状态接口失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "检查登录状态失败: " + err.Error(),
		})
		return
	}

	// 检查响应
	if code, ok := response["code"].(float64); ok {
		if code == 20000 {
			// Star 接口调用成功，现在可以安全地进行数据库操作
			// 检查是否是绑定场景（用户已登录）
			id := c.GetInt("id")
			isBindMode := false

			if id > 0 {
				// 用户已登录，检查是否是绑定场景
				var user model.User
				if err := model.DB.Where("id = ?", id).First(&user).Error; err == nil && user.StarUserId != "" {
					// 尝试从 cookies 获取 xtoken
					if cookieXtoken, err := c.Cookie("xtoken"); err == nil && cookieXtoken != "" {
						isBindMode = true // 用户已登录且有 star_user_id 和 xtoken，这是绑定场景
					}
				}
			}

			// 成功，检查返回的数据
			data, ok := response["data"].(map[string]interface{})
			if !ok {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "响应数据格式错误",
				})
				return
			}

			// 如果直接返回了登录凭证（老用户），直接处理登录
			if xuseridVal, ok := data["xuserid"]; ok {
				xuseridStr := fmt.Sprintf("%v", xuseridVal)
				xtoken, _ := data["xtoken"].(string)
				xy_uuid_token, _ := data["xy_uuid_token"].(string)

				if xuseridStr != "" && xtoken != "" {
					if isBindMode {
						// 绑定场景：更新当前用户的微信信息
						handleStarWechatBind(c, id, xuseridStr, xtoken, xy_uuid_token)
					} else {
						// 登录场景：处理登录
						handleStarWechatLogin(c, xuseridStr, xtoken, xy_uuid_token)
					}
					return
				}
			}

			// 如果有 wechat_temp_token（新用户），返回给前端让前端调用绑定接口
			if wechatTempToken, ok := data["wechat_temp_token"].(string); ok && wechatTempToken != "" {
				// 绑定场景：返回 wechat_temp_token 让前端调用绑定接口
				// 登录场景：自动调用绑定接口创建新用户
				if isBindMode {
					// 绑定场景：返回 wechat_temp_token，让前端调用 /u/wechat_bind
					c.JSON(http.StatusOK, gin.H{
						"success": true,
						"message": "",
						"data":    data, // 包含 wechat_temp_token
					})
					return
				} else {
					// 登录场景：自动调用绑定接口创建新用户
					bindRequestBody := map[string]interface{}{
						"is_bind":          false,
						"wechat_temp_token": wechatTempToken,
					}

					// 调用绑定接口
					bindResponse, err := callStarBackendAPI("POST", "u/wechat_bind", bindRequestBody, nil)

					if err != nil {
						common.SysLog(fmt.Sprintf("调用 Star 微信绑定接口失败: %v", err))
						c.JSON(http.StatusOK, gin.H{
							"success": false,
							"message": "微信绑定失败: " + err.Error(),
						})
						return
					}

					// 检查绑定响应
					if bindCode, ok := bindResponse["code"].(float64); ok && bindCode == 20000 {
						if bindData, ok := bindResponse["data"].(map[string]interface{}); ok {
							xuseridVal := bindData["xuserid"]
							xuseridStr := fmt.Sprintf("%v", xuseridVal)
							xtoken, _ := bindData["xtoken"].(string)
							xy_uuid_token, _ := bindData["xy_uuid_token"].(string)

							if xuseridStr != "" && xtoken != "" {
								// 登录场景：处理登录
								handleStarWechatLogin(c, xuseridStr, xtoken, xy_uuid_token)
								return
							}
						}
					}

					// 绑定失败
					msg := ""
					if msgVal, ok := bindResponse["msg"].(string); ok {
						msg = msgVal
					}
					c.JSON(http.StatusOK, gin.H{
						"success": false,
						"message": msg,
					})
					return
				}
			}

			// 未扫码或等待确认，返回原始数据让前端继续轮询
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "",
				"data":    data,
			})
		} else {
			// 失败，转换为 new-api 格式
			msg := ""
			if msgVal, ok := response["msg"].(string); ok {
				msg = msgVal
			}
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": msg,
			})
		}
	} else {
		// 直接返回原响应
		c.JSON(http.StatusOK, response)
	}
}

// handleStarWechatBind 处理 Star 微信绑定（更新已登录用户的微信信息）
func handleStarWechatBind(c *gin.Context, userId int, starUserId, xtoken, xy_uuid_token string) {
	// 获取 Star 用户信息
	var starUserInfo *StarUserInfo
	if starUserId != "" && xtoken != "" {
		success, info, err := callGetUserInfoAPI(starUserId, xtoken)
		if err != nil {
			common.SysLog(fmt.Sprintf("获取 Star 用户信息失败: %v", err))
		} else if success && info != nil {
			starUserInfo = info
		}
	}

	// 查找当前用户
	var user model.User
	if err := model.DB.Where("id = ?", userId).First(&user).Error; err != nil {
		common.SysLog(fmt.Sprintf("查找用户失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户不存在",
		})
		return
	}

	// 更新用户的微信信息
	updates := map[string]interface{}{}

	if starUserInfo != nil && starUserInfo.WechatOpenid != "" {
		updates["wechat_id"] = starUserInfo.WechatOpenid
	}

	// 更新 star_user_id（如果还没有）
	if user.StarUserId == "" && starUserId != "" {
		updates["star_user_id"] = starUserId
	}

	if len(updates) > 0 {
		if err := model.DB.Model(&user).Updates(updates).Error; err != nil {
			common.SysLog(fmt.Sprintf("更新用户微信信息失败: %v", err))
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "更新微信信息失败",
			})
			return
		}
		// 重新获取用户信息
		model.DB.Where("id = ?", userId).First(&user)
	}

	// 更新 Star 认证 cookies
	if starUserId != "" && xtoken != "" {
		c.SetCookie("xuserid", starUserId, 60*60*24*3, "/", "", false, true) // 3天
		c.SetCookie("xtoken", xtoken, 60*60*24*3, "/", "", false, true)     // 3天
		if xy_uuid_token != "" {
			c.SetCookie("xy_uuid_token", xy_uuid_token, 60*60*24*90, "/", "", false, true) // 90天
		}
	}

	// 返回当前用户信息（绑定成功）
	setupLogin(&user, c)
}

// handleStarWechatLogin 处理 Star 微信登录（创建或查找用户，设置 session）
func handleStarWechatLogin(c *gin.Context, starUserId, xtoken, xy_uuid_token string) {
	// 获取 Star 用户信息
	var starUserInfo *StarUserInfo
	if starUserId != "" && xtoken != "" {
		success, info, err := callGetUserInfoAPI(starUserId, xtoken)
		if err != nil {
			common.SysLog(fmt.Sprintf("获取 Star 用户信息失败: %v", err))
		} else if success && info != nil {
			starUserInfo = info
		}
	}

	// 查找或创建用户
	var user model.User

	// 使用 star_user_id 查找用户
	err := model.DB.Where("star_user_id = ?", starUserId).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 用户不存在，创建新用户
			// 参考原版 Register 逻辑：获取 aff 参数并转换为邀请人ID（只有在创建新用户时才处理）
			affCode := c.Query("aff")
			inviterId, _ := model.GetUserIdByAffCode(affCode) // 参考原版：affCode 是邀请人的码，不是用户自己的码
			common.SysLog(fmt.Sprintf("微信扫码登录自动注册流程: affCode=%s, inviterId=%d, starUserId=%s", affCode, inviterId, starUserId))
			
			defaultPassword, err := common.GenerateRandomCharsKey(32)
			if err != nil {
				common.SysLog(fmt.Sprintf("生成默认密码失败: %v", err))
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "系统错误，请稍后重试",
				})
				return
			}

			newUser := model.User{
				Password:    defaultPassword,
				Role:        common.RoleCommonUser,
				Status:      common.UserStatusEnabled,
				StarUserId:  starUserId,
				InviterId:   inviterId, // 参考原版：直接设置 InviterId
			}
			common.SysLog(fmt.Sprintf("微信扫码登录准备创建新用户: InviterId=%d, starUserId=%s", newUser.InviterId, newUser.StarUserId))

			// 使用 Star 用户信息
			if starUserInfo != nil {
				if starUserInfo.Username != "" {
					newUser.Username = starUserInfo.Username
					newUser.DisplayName = starUserInfo.Username
				} else {
					newUser.Username = "wechat_user_" + starUserId
					newUser.DisplayName = "微信用户"
				}
				if starUserInfo.Email != "" {
					newUser.Email = starUserInfo.Email
				}
				if starUserInfo.WechatOpenid != "" {
					newUser.WeChatId = starUserInfo.WechatOpenid
				}
				if starUserInfo.Status == 0 {
					newUser.Status = common.UserStatusDisabled
				}
			} else {
				newUser.Username = "wechat_user_" + starUserId
				newUser.DisplayName = "微信用户"
			}

			// 插入用户（传入 inviterId 以处理邀请关系，参考原版 Register 逻辑）
			if err := newUser.Insert(inviterId); err != nil {
				common.SysLog(fmt.Sprintf("自动注册用户失败: %v", err))
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "自动注册失败，请稍后重试",
				})
				return
			}

			// 重新获取创建的用户
			err = model.DB.Where("star_user_id = ?", starUserId).First(&user).Error
			if err != nil {
				common.SysLog(fmt.Sprintf("获取新创建用户失败: %v", err))
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "用户创建成功但登录失败，请稍后重试",
				})
				return
			}
		} else {
			common.SysLog(fmt.Sprintf("查询用户失败: %v", err))
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "数据库错误，请稍后重试",
			})
			return
		}
	}

	// 检查用户状态
	if user.Status != common.UserStatusEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户已被封禁",
		})
		return
	}

	// 更新用户信息（如果有 Star 用户信息）
	if starUserInfo != nil {
		updates := map[string]interface{}{}

		if starUserInfo.Username != "" && starUserInfo.Username != user.Username {
			updates["username"] = starUserInfo.Username
			updates["display_name"] = starUserInfo.Username
		}

		if starUserInfo.Email != "" && starUserInfo.Email != user.Email {
			updates["email"] = starUserInfo.Email
		}

		if starUserInfo.WechatOpenid != "" && starUserInfo.WechatOpenid != user.WeChatId {
			updates["wechat_id"] = starUserInfo.WechatOpenid
		}

		if starUserInfo.Status == 0 && user.Status == common.UserStatusEnabled {
			updates["status"] = common.UserStatusDisabled
		} else if starUserInfo.Status == 1 && user.Status == common.UserStatusDisabled {
			updates["status"] = common.UserStatusEnabled
		}

		if len(updates) > 0 {
			if err := model.DB.Model(&user).Updates(updates).Error; err != nil {
				common.SysLog(fmt.Sprintf("更新用户信息失败: %v", err))
			} else {
				model.DB.Where("id = ?", user.Id).First(&user)
			}
		}
	}

	// 设置 Star 认证 cookies
	if starUserId != "" && xtoken != "" {
		c.SetCookie("xuserid", starUserId, 60*60*24*3, "/", "", false, true) // 3天
		c.SetCookie("xtoken", xtoken, 60*60*24*3, "/", "", false, true)     // 3天
		if xy_uuid_token != "" {
			c.SetCookie("xy_uuid_token", xy_uuid_token, 60*60*24*90, "/", "", false, true) // 90天
		}
	}

	// 调用 setupLogin 设置会话并返回用户信息
	setupLogin(&user, c)
}

// StarWechatBind 微信绑定/登录接口 - 返回 new-api 格式
func StarWechatBind(c *gin.Context) {
	if !common.StarUserSystemEnabled || common.StarBackendAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Star 用户系统未启用",
		})
		return
	}

	var request struct {
		IsBind         bool   `json:"is_bind"`
		WechatTempToken string `json:"wechat_temp_token" binding:"required"`
		Xuserid        *int   `json:"xuserid,omitempty"`
		Xtoken         string `json:"xtoken,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误: " + err.Error(),
		})
		return
	}

	// 如果是绑定场景，需要用户已登录
	var userId int
	if request.IsBind {
		userId = c.GetInt("id")
		if userId == 0 {
			// 尝试从 session 获取
			session := sessions.Default(c)
			if id := session.Get("id"); id != nil {
				if idInt, ok := id.(int); ok {
					userId = idInt
				}
			}
		}
		if userId == 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "请先登录",
			})
			return
		}
	}

	requestBody := map[string]interface{}{
		"is_bind":          request.IsBind,
		"wechat_temp_token": request.WechatTempToken,
	}
	if request.Xuserid != nil {
		requestBody["xuserid"] = *request.Xuserid
	}
	if request.Xtoken != "" {
		requestBody["xtoken"] = request.Xtoken
	}

	// 调用 Star 后端微信绑定接口
	response, err := callStarBackendAPI("POST", "u/wechat_bind", requestBody, nil)

	if err != nil {
		common.SysLog(fmt.Sprintf("调用 Star 微信绑定接口失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "微信绑定失败: " + err.Error(),
		})
		return
	}

	// 将 Star 后端的响应转换为 new-api 格式
	if code, ok := response["code"].(float64); ok {
		if code == 20000 {
			// 成功，检查是否是绑定场景
			if request.IsBind && userId > 0 {
				// 绑定场景：更新本地数据库的微信信息
				if bindData, ok := response["data"].(map[string]interface{}); ok {
					xuseridVal := bindData["xuserid"]
					xuseridStr := fmt.Sprintf("%v", xuseridVal)
					xtoken, _ := bindData["xtoken"].(string)
					xy_uuid_token, _ := bindData["xy_uuid_token"].(string)

					if xuseridStr != "" && xtoken != "" {
						// 更新当前用户的微信信息
						handleStarWechatBind(c, userId, xuseridStr, xtoken, xy_uuid_token)
						return
					}
				}
			}

			// 登录场景或绑定场景但不需要更新本地数据库：直接返回
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "",
				"data":    response["data"],
			})
		} else {
			// 失败，转换为 new-api 格式
			msg := ""
			if msgVal, ok := response["msg"].(string); ok {
				msg = msgVal
			}
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": msg,
			})
		}
	} else {
		// 直接返回原响应
		c.JSON(http.StatusOK, response)
	}
}

// StarGetUserInfo 获取 Star 用户信息接口 - 返回 new-api 格式
func StarGetUserInfo(c *gin.Context) {
	if !common.StarUserSystemEnabled || common.StarBackendAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Star 用户系统未启用",
		})
		return
	}

	// 先尝试从请求头或 cookies 获取认证信息（不进行数据库查询）
	var xuserid string
	var xtoken string

	// 尝试从请求头获取
	xuserid = c.GetHeader("xuserid")
	xtoken = c.GetHeader("xtoken")

	// 如果请求头没有，尝试从 cookies 获取
	if xuserid == "" || xtoken == "" {
		if cookieXuserid, err := c.Cookie("xuserid"); err == nil {
			xuserid = cookieXuserid
		}
		if cookieXtoken, err := c.Cookie("xtoken"); err == nil {
			xtoken = cookieXtoken
		}
	}

	// 如果仍然没有，尝试从 session 获取（需要数据库查询，但这是读取操作）
	if xuserid == "" || xtoken == "" {
		id := c.GetInt("id")
		if id > 0 {
			// 从数据库获取用户的 star_user_id（读取操作，不影响业务逻辑）
			var user model.User
			if err := model.DB.Where("id = ?", id).First(&user).Error; err == nil && user.StarUserId != "" {
				xuserid = user.StarUserId
				// 尝试从 cookies 获取 xtoken
				if cookieXtoken, err := c.Cookie("xtoken"); err == nil {
					xtoken = cookieXtoken
				}
			}
		}
	}

	if xuserid == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户未绑定 Star 账户，请先登录 Star 系统",
		})
		return
	}
	
	if xtoken == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Star 认证 token 已过期，请重新登录",
		})
		return
	}

	// 先调用 Star 后端获取用户信息
	// 只有在 star 接口调用成功后才进行数据库操作
	success, starUserInfo, err := callGetUserInfoAPI(xuserid, xtoken)
	if err != nil {
		common.SysLog(fmt.Sprintf("获取 Star 用户信息失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取用户信息失败: " + err.Error(),
		})
		return
	}

	if !success || starUserInfo == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取用户信息失败",
		})
		return
	}

	// 转换为 new-api 格式
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    starUserInfo,
	})
}

// StarChangeUserInfo 修改 Star 用户信息接口 - 返回 new-api 格式
func StarChangeUserInfo(c *gin.Context) {
	if !common.StarUserSystemEnabled || common.StarBackendAddress == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Star 用户系统未启用",
		})
		return
	}

	// 优先从 session 获取当前登录用户
	id := c.GetInt("id")
	var xuserid string
	var xtoken string

	if id > 0 {
		// 从数据库获取用户的 star_user_id
		var user model.User
		if err := model.DB.Where("id = ?", id).First(&user).Error; err == nil && user.StarUserId != "" {
			xuserid = user.StarUserId
			// 尝试从 cookies 获取 xtoken
			if cookieXtoken, err := c.Cookie("xtoken"); err == nil {
				xtoken = cookieXtoken
			}
		}
	}

	// 如果 session 中没有，尝试从请求头获取
	if xuserid == "" || xtoken == "" {
		xuserid = c.GetHeader("xuserid")
		xtoken = c.GetHeader("xtoken")
	}

	// 如果请求头没有，尝试从 cookies 获取
	if xuserid == "" || xtoken == "" {
		if cookieXuserid, err := c.Cookie("xuserid"); err == nil {
			xuserid = cookieXuserid
		}
		if cookieXtoken, err := c.Cookie("xtoken"); err == nil {
			xtoken = cookieXtoken
		}
	}

	if xuserid == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户未绑定 Star 账户，请先登录 Star 系统",
		})
		return
	}
	
	if xtoken == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Star 认证 token 已过期，请重新登录",
		})
		return
	}

	var request struct {
		ChangeType string `json:"change_type" binding:"required"`
		Username   string `json:"username,omitempty"`
		Email      string `json:"email,omitempty"`
		EmailCode  string `json:"email_code,omitempty"`
		Tel        string `json:"tel,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误: " + err.Error(),
		})
		return
	}

	// 构建请求体
	requestBody := map[string]interface{}{
		"change_type": request.ChangeType,
	}
	if request.Username != "" {
		requestBody["username"] = request.Username
	}
	if request.Email != "" {
		requestBody["email"] = request.Email
	}
	if request.EmailCode != "" {
		requestBody["email_code"] = request.EmailCode
	}
	if request.Tel != "" {
		requestBody["tel"] = request.Tel
	}

	// 调用 Star 后端修改用户信息接口
	headers := map[string]string{
		"xuserid": xuserid,
		"xtoken":  xtoken,
	}
	response, err := callStarBackendAPI("POST", "u/change_user_info", requestBody, headers)

	if err != nil {
		common.SysLog(fmt.Sprintf("调用 Star 修改用户信息接口失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "修改用户信息失败: " + err.Error(),
		})
		return
	}

	// 将 Star 后端的响应转换为 new-api 格式
	if code, ok := response["code"].(float64); ok {
		if code == 20000 {
			// 成功，同步更新本地数据库
			if id > 0 {
				// 重新获取 Star 用户信息以同步到本地数据库
				success, starUserInfo, err := callGetUserInfoAPI(xuserid, xtoken)
				if err == nil && success && starUserInfo != nil {
					// 从数据库获取用户
					var user model.User
					if err := model.DB.Where("id = ?", id).First(&user).Error; err == nil {
						updates := map[string]interface{}{}
						syncErrors := []string{}
						
						// 更新用户名（如果 Star 中的用户名与本地不同）
						if starUserInfo.Username != "" && starUserInfo.Username != user.Username {
							// 检查新用户名是否已被其他用户使用（排除当前用户，包括软删除的用户）
							// 使用 Unscoped() 因为数据库唯一性约束包括软删除的记录
							var existingUser model.User
							err := model.DB.Unscoped().Where("username = ? AND id != ?", starUserInfo.Username, user.Id).First(&existingUser).Error
							if err != nil {
								if errors.Is(err, gorm.ErrRecordNotFound) {
									// 用户名可用，可以更新
									updates["username"] = starUserInfo.Username
									updates["display_name"] = starUserInfo.Username
									common.SysLog(fmt.Sprintf("同步更新用户 %d 的用户名: %s -> %s", user.Id, user.Username, starUserInfo.Username))
								} else {
									// 数据库查询错误
									syncErrors = append(syncErrors, fmt.Sprintf("检查用户名唯一性失败: %v", err))
									common.SysLog(fmt.Sprintf("检查用户名唯一性失败: %v", err))
								}
							} else {
								// 用户名已被其他用户使用（包括已删除的用户）
								syncErrors = append(syncErrors, fmt.Sprintf("用户名 %s 已被其他用户使用，无法同步", starUserInfo.Username))
								common.SysLog(fmt.Sprintf("用户名 %s 已被其他用户使用（用户ID: %d），无法同步到用户 %d", starUserInfo.Username, existingUser.Id, user.Id))
							}
						}
						
						// 更新邮箱（如果 Star 中的邮箱与本地不同）
						if starUserInfo.Email != "" && starUserInfo.Email != user.Email {
							// 检查新邮箱是否已被其他用户使用（排除当前用户，包括软删除的用户）
							// 使用 Unscoped() 因为数据库唯一性约束包括软删除的记录
							var existingUser model.User
							err := model.DB.Unscoped().Where("email = ? AND id != ?", starUserInfo.Email, user.Id).First(&existingUser).Error
							if err != nil {
								if errors.Is(err, gorm.ErrRecordNotFound) {
									// 邮箱可用，可以更新
									updates["email"] = starUserInfo.Email
									common.SysLog(fmt.Sprintf("同步更新用户 %d 的邮箱: %s -> %s", user.Id, user.Email, starUserInfo.Email))
								} else {
									// 数据库查询错误
									syncErrors = append(syncErrors, fmt.Sprintf("检查邮箱唯一性失败: %v", err))
									common.SysLog(fmt.Sprintf("检查邮箱唯一性失败: %v", err))
								}
							} else {
								// 邮箱已被其他用户使用（包括已删除的用户）
								syncErrors = append(syncErrors, fmt.Sprintf("邮箱 %s 已被其他用户使用，无法同步", starUserInfo.Email))
								common.SysLog(fmt.Sprintf("邮箱 %s 已被其他用户使用（用户ID: %d），无法同步到用户 %d", starUserInfo.Email, existingUser.Id, user.Id))
							}
						}
						
						// 如果有更新，执行更新操作
						if len(updates) > 0 {
							if err := model.DB.Model(&user).Updates(updates).Error; err != nil {
								// 检查是否是唯一性约束冲突
								if strings.Contains(err.Error(), "Duplicate entry") || strings.Contains(err.Error(), "UNIQUE constraint") {
									syncErrors = append(syncErrors, "用户名或邮箱已被使用，可能存在并发冲突")
									common.SysLog(fmt.Sprintf("同步更新用户信息到数据库失败（唯一性冲突）: %v", err))
								} else {
									syncErrors = append(syncErrors, fmt.Sprintf("数据库更新失败: %v", err))
									common.SysLog(fmt.Sprintf("同步更新用户信息到数据库失败: %v", err))
								}
							} else {
								common.SysLog(fmt.Sprintf("成功同步更新用户 %d 的信息到数据库", user.Id))
							}
						}
						
						// 如果有同步错误，在响应消息中提示用户
						if len(syncErrors) > 0 {
							common.SysLog(fmt.Sprintf("用户 %d 信息同步部分失败: %v", user.Id, syncErrors))
							// 注意：这里不返回错误，因为 Star 系统已经成功修改，只是本地同步失败
							// 可以在响应消息中添加警告信息
						}
					}
				} else {
					common.SysLog(fmt.Sprintf("获取 Star 用户信息失败，无法同步到数据库: %v", err))
				}
			}
			
			// 转换为 new-api 格式
			msg := ""
			if msgVal, ok := response["msg"].(string); ok {
				msg = msgVal
			}
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": msg,
				"data":    response["data"],
			})
		} else {
			// 失败，转换为 new-api 格式
			msg := ""
			if msgVal, ok := response["msg"].(string); ok {
				msg = msgVal
			}
			common.SysLog(fmt.Sprintf("Star 修改用户信息失败: code=%v, msg=%s", code, msg))
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": msg,
			})
		}
	} else {
		// 直接返回原响应
		common.SysLog(fmt.Sprintf("Star 修改用户信息响应格式异常: %v", response))
		c.JSON(http.StatusOK, response)
	}
}

// setup session & cookies and then return user info
func setupLogin(user *model.User, c *gin.Context) {
	session := sessions.Default(c)
	session.Set("id", user.Id)
	session.Set("username", user.Username)
	session.Set("role", user.Role)
	session.Set("status", user.Status)
	session.Set("group", user.Group)
	err := session.Save()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "无法保存会话信息，请重试",
			"success": false,
		})
		return
	}
	// 返回用户数据（不包含敏感信息如密码）
	// 注意：不要返回 Password 和 OriginalPassword 字段
	cleanUser := model.User{
		Id:          user.Id,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Role:        user.Role,
		Status:      user.Status,
		Group:       user.Group,
		Email:       user.Email,
		Quota:       user.Quota,
		UsedQuota:   user.UsedQuota,
		RequestCount: user.RequestCount,
		AffCode:     user.AffCode,
		AffCount:    user.AffCount,
		AffQuota:    user.AffQuota,
		AffHistoryQuota: user.AffHistoryQuota,
		InviterId:   user.InviterId,
		StarUserId:  user.StarUserId,
		WeChatId:    user.WeChatId,
		GitHubId:    user.GitHubId,
		DiscordId:   user.DiscordId,
		OidcId:      user.OidcId,
		TelegramId:  user.TelegramId,
		LinuxDOId:   user.LinuxDOId,
		Setting:     user.Setting,
		StripeCustomer: user.StripeCustomer,
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "",
		"success": true,
		"data":    cleanUser,
	})
}

func Logout(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	err := session.Save()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": err.Error(),
			"success": false,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "",
		"success": true,
	})
}

func Register(c *gin.Context) {
	// 如果启用了 Star 用户系统，禁用原有的注册功能
	if common.StarUserSystemEnabled && common.StarBackendAddress != "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "已启用 Star 用户系统，请使用 Star 注册接口进行注册",
		})
		return
	}
	if !common.RegisterEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "管理员关闭了新用户注册",
			"success": false,
		})
		return
	}
	if !common.PasswordRegisterEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "管理员关闭了通过密码进行注册，请使用第三方账户验证的形式进行注册",
			"success": false,
		})
		return
	}
	var user model.User
	err := json.NewDecoder(c.Request.Body).Decode(&user)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}
	if err := common.Validate.Struct(&user); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "输入不合法 " + err.Error(),
		})
		return
	}
	if common.EmailVerificationEnabled {
		if user.Email == "" || user.VerificationCode == "" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "管理员开启了邮箱验证，请输入邮箱地址和验证码",
			})
			return
		}
		if !common.VerifyCodeWithKey(user.Email, user.VerificationCode, common.EmailVerificationPurpose) {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "验证码错误或已过期",
			})
			return
		}
	}
	exist, err := model.CheckUserExistOrDeleted(user.Username, user.Email)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "数据库错误，请稍后重试",
		})
		common.SysLog(fmt.Sprintf("CheckUserExistOrDeleted error: %v", err))
		return
	}
	if exist {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户名已存在，或已注销",
		})
		return
	}
	affCode := user.AffCode // this code is the inviter's code, not the user's own code
	inviterId, _ := model.GetUserIdByAffCode(affCode)
	cleanUser := model.User{
		Username:    user.Username,
		Password:    user.Password,
		DisplayName: user.Username,
		InviterId:   inviterId,
		Role:        common.RoleCommonUser, // 明确设置角色为普通用户
	}
	if common.EmailVerificationEnabled {
		cleanUser.Email = user.Email
	}
	if err := cleanUser.Insert(inviterId); err != nil {
		common.ApiError(c, err)
		return
	}

	// 默认令牌已在 Insert 方法中自动创建

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

func GetAllUsers(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	users, total, err := model.GetAllUsers(pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(users)

	common.ApiSuccess(c, pageInfo)
	return
}

func SearchUsers(c *gin.Context) {
	keyword := c.Query("keyword")
	group := c.Query("group")
	pageInfo := common.GetPageQuery(c)
	users, total, err := model.SearchUsers(keyword, group, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(users)
	common.ApiSuccess(c, pageInfo)
	return
}

func GetUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	user, err := model.GetUserById(id, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	myRole := c.GetInt("role")
	if myRole <= user.Role && myRole != common.RoleRootUser {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无权获取同级或更高等级用户的信息",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    user,
	})
	return
}

func GenerateAccessToken(c *gin.Context) {
	id := c.GetInt("id")
	user, err := model.GetUserById(id, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	// get rand int 28-32
	randI := common.GetRandomInt(4)
	key, err := common.GenerateRandomKey(29 + randI)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "生成失败",
		})
		common.SysLog("failed to generate key: " + err.Error())
		return
	}
	user.SetAccessToken(key)

	if model.DB.Where("access_token = ?", user.AccessToken).First(user).RowsAffected != 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "请重试，系统生成的 UUID 竟然重复了！",
		})
		return
	}

	if err := user.Update(false); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    user.AccessToken,
	})
	return
}

type TransferAffQuotaRequest struct {
	Quota int `json:"quota" binding:"required"`
}

func TransferAffQuota(c *gin.Context) {
	id := c.GetInt("id")
	user, err := model.GetUserById(id, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	tran := TransferAffQuotaRequest{}
	if err := c.ShouldBindJSON(&tran); err != nil {
		common.ApiError(c, err)
		return
	}
	err = user.TransferAffQuotaToQuota(tran.Quota)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "划转失败 " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "划转成功",
	})
}

func GetAffCode(c *gin.Context) {
	id := c.GetInt("id")
	user, err := model.GetUserById(id, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user.AffCode == "" {
		user.AffCode = common.GetRandomString(4)
		if err := user.Update(false); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    user.AffCode,
	})
	return
}

func GetSelf(c *gin.Context) {
	id := c.GetInt("id")
	userRole := c.GetInt("role")
	user, err := model.GetUserById(id, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	// Hide admin remarks: set to empty to trigger omitempty tag, ensuring the remark field is not included in JSON returned to regular users
	user.Remark = ""

	// 计算用户权限信息
	permissions := calculateUserPermissions(userRole)

	// 获取用户设置并提取sidebar_modules
	userSetting := user.GetSetting()

	// 构建响应数据，包含用户信息和权限
	responseData := map[string]interface{}{
		"id":                user.Id,
		"username":          user.Username,
		"display_name":      user.DisplayName,
		"role":              user.Role,
		"status":            user.Status,
		"email":             user.Email,
		"github_id":         user.GitHubId,
		"discord_id":        user.DiscordId,
		"oidc_id":           user.OidcId,
		"wechat_id":         user.WeChatId,
		"telegram_id":       user.TelegramId,
		"star_user_id":      user.StarUserId,
		"group":             user.Group,
		"quota":             user.Quota,
		"used_quota":        user.UsedQuota,
		"request_count":     user.RequestCount,
		"aff_code":          user.AffCode,
		"aff_count":         user.AffCount,
		"aff_quota":         user.AffQuota,
		"aff_history_quota": user.AffHistoryQuota,
		"inviter_id":        user.InviterId,
		"linux_do_id":       user.LinuxDOId,
		"setting":           user.Setting,
		"stripe_customer":   user.StripeCustomer,
		"sidebar_modules":   userSetting.SidebarModules, // 正确提取sidebar_modules字段
		"permissions":       permissions,                // 新增权限字段
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    responseData,
	})
	return
}

// 计算用户权限的辅助函数
func calculateUserPermissions(userRole int) map[string]interface{} {
	permissions := map[string]interface{}{}

	// 根据用户角色计算权限
	if userRole == common.RoleRootUser {
		// 超级管理员不需要边栏设置功能
		permissions["sidebar_settings"] = false
		permissions["sidebar_modules"] = map[string]interface{}{}
	} else if userRole == common.RoleAdminUser {
		// 管理员可以设置边栏，但不包含系统设置功能
		permissions["sidebar_settings"] = true
		permissions["sidebar_modules"] = map[string]interface{}{
			"admin": map[string]interface{}{
				"setting": false, // 管理员不能访问系统设置
			},
		}
	} else {
		// 普通用户只能设置个人功能，不包含管理员区域
		permissions["sidebar_settings"] = true
		permissions["sidebar_modules"] = map[string]interface{}{
			"admin": false, // 普通用户不能访问管理员区域
		}
	}

	return permissions
}

// 根据用户角色生成默认的边栏配置
func generateDefaultSidebarConfig(userRole int) string {
	defaultConfig := map[string]interface{}{}

	// 聊天区域 - 所有用户都可以访问
	defaultConfig["chat"] = map[string]interface{}{
		"enabled":    true,
		"playground": true,
		"chat":       true,
	}

	// 控制台区域 - 所有用户都可以访问
	defaultConfig["console"] = map[string]interface{}{
		"enabled":    true,
		"detail":     true,
		"token":      true,
		"log":        true,
		"midjourney": true,
		"task":       true,
	}

	// 个人中心区域 - 所有用户都可以访问
	defaultConfig["personal"] = map[string]interface{}{
		"enabled":  true,
		"topup":    true,
		"personal": true,
	}

	// 管理员区域 - 根据角色决定
	if userRole == common.RoleAdminUser {
		// 管理员可以访问管理员区域，但不能访问系统设置
		defaultConfig["admin"] = map[string]interface{}{
			"enabled":    true,
			"channel":    true,
			"models":     true,
			"redemption": true,
			"user":       true,
			"setting":    false, // 管理员不能访问系统设置
		}
	} else if userRole == common.RoleRootUser {
		// 超级管理员可以访问所有功能
		defaultConfig["admin"] = map[string]interface{}{
			"enabled":    true,
			"channel":    true,
			"models":     true,
			"redemption": true,
			"user":       true,
			"setting":    true,
		}
	}
	// 普通用户不包含admin区域

	// 转换为JSON字符串
	configBytes, err := json.Marshal(defaultConfig)
	if err != nil {
		common.SysLog("生成默认边栏配置失败: " + err.Error())
		return ""
	}

	return string(configBytes)
}

func GetUserModels(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		id = c.GetInt("id")
	}
	user, err := model.GetUserCache(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	groups := service.GetUserUsableGroups(user.Group)
	var models []string
	for group := range groups {
		for _, g := range model.GetGroupEnabledModels(group) {
			if !common.StringsContains(models, g) {
				models = append(models, g)
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    models,
	})
	return
}

func UpdateUser(c *gin.Context) {
	var updatedUser model.User
	err := json.NewDecoder(c.Request.Body).Decode(&updatedUser)
	if err != nil || updatedUser.Id == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}
	if updatedUser.Password == "" {
		updatedUser.Password = "$I_LOVE_U" // make Validator happy :)
	}
	if err := common.Validate.Struct(&updatedUser); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "输入不合法 " + err.Error(),
		})
		return
	}
	originUser, err := model.GetUserById(updatedUser.Id, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	myRole := c.GetInt("role")
	if myRole <= originUser.Role && myRole != common.RoleRootUser {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无权更新同权限等级或更高权限等级的用户信息",
		})
		return
	}
	if myRole <= updatedUser.Role && myRole != common.RoleRootUser {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无权将其他用户权限等级提升到大于等于自己的权限等级",
		})
		return
	}
	if updatedUser.Password == "$I_LOVE_U" {
		updatedUser.Password = "" // rollback to what it should be
	}
	updatePassword := updatedUser.Password != ""
	if err := updatedUser.Edit(updatePassword); err != nil {
		common.ApiError(c, err)
		return
	}
	if originUser.Quota != updatedUser.Quota {
		model.RecordLog(originUser.Id, model.LogTypeManage, fmt.Sprintf("管理员将用户额度从 %s修改为 %s", logger.LogQuota(originUser.Quota), logger.LogQuota(updatedUser.Quota)))
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

func UpdateSelf(c *gin.Context) {
	var requestData map[string]interface{}
	err := json.NewDecoder(c.Request.Body).Decode(&requestData)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}

	// 检查是否是sidebar_modules更新请求
	if sidebarModules, exists := requestData["sidebar_modules"]; exists {
		userId := c.GetInt("id")
		user, err := model.GetUserById(userId, false)
		if err != nil {
			common.ApiError(c, err)
			return
		}

		// 获取当前用户设置
		currentSetting := user.GetSetting()

		// 更新sidebar_modules字段
		if sidebarModulesStr, ok := sidebarModules.(string); ok {
			currentSetting.SidebarModules = sidebarModulesStr
		}

		// 保存更新后的设置
		user.SetSetting(currentSetting)
		if err := user.Update(false); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "更新设置失败: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "设置更新成功",
		})
		return
	}

	// 原有的用户信息更新逻辑
	var user model.User
	requestDataBytes, err := json.Marshal(requestData)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}
	err = json.Unmarshal(requestDataBytes, &user)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}

	if user.Password == "" {
		user.Password = "$I_LOVE_U" // make Validator happy :)
	}
	if err := common.Validate.Struct(&user); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "输入不合法 " + err.Error(),
		})
		return
	}

	cleanUser := model.User{
		Id:          c.GetInt("id"),
		Username:    user.Username,
		Password:    user.Password,
		DisplayName: user.DisplayName,
	}
	if user.Password == "$I_LOVE_U" {
		user.Password = "" // rollback to what it should be
		cleanUser.Password = ""
	}
	updatePassword, err := checkUpdatePassword(user.OriginalPassword, user.Password, cleanUser.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := cleanUser.Update(updatePassword); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

func checkUpdatePassword(originalPassword string, newPassword string, userId int) (updatePassword bool, err error) {
	var currentUser *model.User
	currentUser, err = model.GetUserById(userId, true)
	if err != nil {
		return
	}
	if !common.ValidatePasswordAndHash(originalPassword, currentUser.Password) {
		err = fmt.Errorf("原密码错误")
		return
	}
	if newPassword == "" {
		return
	}
	updatePassword = true
	return
}

func DeleteUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	originUser, err := model.GetUserById(id, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	myRole := c.GetInt("role")
	if myRole <= originUser.Role {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无权删除同权限等级或更高权限等级的用户",
		})
		return
	}
	err = model.HardDeleteUserById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
		})
		return
	}
}

func DeleteSelf(c *gin.Context) {
	id := c.GetInt("id")
	user, _ := model.GetUserById(id, false)

	if user.Role == common.RoleRootUser {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "不能删除超级管理员账户",
		})
		return
	}

	err := model.DeleteUserById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

func CreateUser(c *gin.Context) {
	var user model.User
	err := json.NewDecoder(c.Request.Body).Decode(&user)
	user.Username = strings.TrimSpace(user.Username)
	if err != nil || user.Username == "" || user.Password == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}
	if err := common.Validate.Struct(&user); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "输入不合法 " + err.Error(),
		})
		return
	}
	if user.DisplayName == "" {
		user.DisplayName = user.Username
	}
	myRole := c.GetInt("role")
	if user.Role >= myRole {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无法创建权限大于等于自己的用户",
		})
		return
	}
	// Even for admin users, we cannot fully trust them!
	cleanUser := model.User{
		Username:    user.Username,
		Password:    user.Password,
		DisplayName: user.DisplayName,
		Role:        user.Role, // 保持管理员设置的角色
	}
	if err := cleanUser.Insert(0); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

type ManageRequest struct {
	Id     int    `json:"id"`
	Action string `json:"action"`
}

// ManageUser Only admin user can do this
func ManageUser(c *gin.Context) {
	var req ManageRequest
	err := json.NewDecoder(c.Request.Body).Decode(&req)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}
	user := model.User{
		Id: req.Id,
	}
	// Fill attributes
	model.DB.Unscoped().Where(&user).First(&user)
	if user.Id == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户不存在",
		})
		return
	}
	myRole := c.GetInt("role")
	if myRole <= user.Role && myRole != common.RoleRootUser {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无权更新同权限等级或更高权限等级的用户信息",
		})
		return
	}
	switch req.Action {
	case "disable":
		user.Status = common.UserStatusDisabled
		if user.Role == common.RoleRootUser {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "无法禁用超级管理员用户",
			})
			return
		}
	case "enable":
		user.Status = common.UserStatusEnabled
	case "delete":
		if user.Role == common.RoleRootUser {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "无法删除超级管理员用户",
			})
			return
		}
		if err := user.Delete(); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
	case "promote":
		if myRole != common.RoleRootUser {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "普通管理员用户无法提升其他用户为管理员",
			})
			return
		}
		if user.Role >= common.RoleAdminUser {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "该用户已经是管理员",
			})
			return
		}
		user.Role = common.RoleAdminUser
	case "demote":
		if user.Role == common.RoleRootUser {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "无法降级超级管理员用户",
			})
			return
		}
		if user.Role == common.RoleCommonUser {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "该用户已经是普通用户",
			})
			return
		}
		user.Role = common.RoleCommonUser
	}

	if err := user.Update(false); err != nil {
		common.ApiError(c, err)
		return
	}
	clearUser := model.User{
		Role:   user.Role,
		Status: user.Status,
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    clearUser,
	})
	return
}

func EmailBind(c *gin.Context) {
	email := c.Query("email")
	code := c.Query("code")
	if !common.VerifyCodeWithKey(email, code, common.EmailVerificationPurpose) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "验证码错误或已过期",
		})
		return
	}
	session := sessions.Default(c)
	id := session.Get("id")
	user := model.User{
		Id: id.(int),
	}
	err := user.FillUserById()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	user.Email = email
	// no need to check if this email already taken, because we have used verification code to check it
	err = user.Update(false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
	return
}

type topUpRequest struct {
	Key string `json:"key"`
}

var topUpLocks sync.Map
var topUpCreateLock sync.Mutex

type topUpTryLock struct {
	ch chan struct{}
}

func newTopUpTryLock() *topUpTryLock {
	return &topUpTryLock{ch: make(chan struct{}, 1)}
}

func (l *topUpTryLock) TryLock() bool {
	select {
	case l.ch <- struct{}{}:
		return true
	default:
		return false
	}
}

func (l *topUpTryLock) Unlock() {
	select {
	case <-l.ch:
	default:
	}
}

func getTopUpLock(userID int) *topUpTryLock {
	if v, ok := topUpLocks.Load(userID); ok {
		return v.(*topUpTryLock)
	}
	topUpCreateLock.Lock()
	defer topUpCreateLock.Unlock()
	if v, ok := topUpLocks.Load(userID); ok {
		return v.(*topUpTryLock)
	}
	l := newTopUpTryLock()
	topUpLocks.Store(userID, l)
	return l
}

func TopUp(c *gin.Context) {
	id := c.GetInt("id")
	lock := getTopUpLock(id)
	if !lock.TryLock() {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "充值处理中，请稍后重试",
		})
		return
	}
	defer lock.Unlock()
	req := topUpRequest{}
	err := c.ShouldBindJSON(&req)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	quota, err := model.Redeem(req.Key, id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    quota,
	})
}

type UpdateUserSettingRequest struct {
	QuotaWarningType           string  `json:"notify_type"`
	QuotaWarningThreshold      float64 `json:"quota_warning_threshold"`
	WebhookUrl                 string  `json:"webhook_url,omitempty"`
	WebhookSecret              string  `json:"webhook_secret,omitempty"`
	NotificationEmail          string  `json:"notification_email,omitempty"`
	BarkUrl                    string  `json:"bark_url,omitempty"`
	GotifyUrl                  string  `json:"gotify_url,omitempty"`
	GotifyToken                string  `json:"gotify_token,omitempty"`
	GotifyPriority             int     `json:"gotify_priority,omitempty"`
	AcceptUnsetModelRatioModel bool    `json:"accept_unset_model_ratio_model"`
	RecordIpLog                bool    `json:"record_ip_log"`
}

func UpdateUserSetting(c *gin.Context) {
	var req UpdateUserSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的参数",
		})
		return
	}

	// 验证预警类型
	if req.QuotaWarningType != dto.NotifyTypeEmail && req.QuotaWarningType != dto.NotifyTypeWebhook && req.QuotaWarningType != dto.NotifyTypeBark && req.QuotaWarningType != dto.NotifyTypeGotify {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的预警类型",
		})
		return
	}

	// 验证预警阈值
	if req.QuotaWarningThreshold <= 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "预警阈值必须大于0",
		})
		return
	}

	// 如果是webhook类型,验证webhook地址
	if req.QuotaWarningType == dto.NotifyTypeWebhook {
		if req.WebhookUrl == "" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "Webhook地址不能为空",
			})
			return
		}
		// 验证URL格式
		if _, err := url.ParseRequestURI(req.WebhookUrl); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "无效的Webhook地址",
			})
			return
		}
	}

	// 如果是邮件类型，验证邮箱地址
	if req.QuotaWarningType == dto.NotifyTypeEmail && req.NotificationEmail != "" {
		// 验证邮箱格式
		if !strings.Contains(req.NotificationEmail, "@") {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "无效的邮箱地址",
			})
			return
		}
	}

	// 如果是Bark类型，验证Bark URL
	if req.QuotaWarningType == dto.NotifyTypeBark {
		if req.BarkUrl == "" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "Bark推送URL不能为空",
			})
			return
		}
		// 验证URL格式
		if _, err := url.ParseRequestURI(req.BarkUrl); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "无效的Bark推送URL",
			})
			return
		}
		// 检查是否是HTTP或HTTPS
		if !strings.HasPrefix(req.BarkUrl, "https://") && !strings.HasPrefix(req.BarkUrl, "http://") {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "Bark推送URL必须以http://或https://开头",
			})
			return
		}
	}

	// 如果是Gotify类型，验证Gotify URL和Token
	if req.QuotaWarningType == dto.NotifyTypeGotify {
		if req.GotifyUrl == "" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "Gotify服务器地址不能为空",
			})
			return
		}
		if req.GotifyToken == "" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "Gotify令牌不能为空",
			})
			return
		}
		// 验证URL格式
		if _, err := url.ParseRequestURI(req.GotifyUrl); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "无效的Gotify服务器地址",
			})
			return
		}
		// 检查是否是HTTP或HTTPS
		if !strings.HasPrefix(req.GotifyUrl, "https://") && !strings.HasPrefix(req.GotifyUrl, "http://") {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "Gotify服务器地址必须以http://或https://开头",
			})
			return
		}
	}

	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 构建设置
	settings := dto.UserSetting{
		NotifyType:            req.QuotaWarningType,
		QuotaWarningThreshold: req.QuotaWarningThreshold,
		AcceptUnsetRatioModel: req.AcceptUnsetModelRatioModel,
		RecordIpLog:           req.RecordIpLog,
	}

	// 如果是webhook类型,添加webhook相关设置
	if req.QuotaWarningType == dto.NotifyTypeWebhook {
		settings.WebhookUrl = req.WebhookUrl
		if req.WebhookSecret != "" {
			settings.WebhookSecret = req.WebhookSecret
		}
	}

	// 如果提供了通知邮箱，添加到设置中
	if req.QuotaWarningType == dto.NotifyTypeEmail && req.NotificationEmail != "" {
		settings.NotificationEmail = req.NotificationEmail
	}

	// 如果是Bark类型，添加Bark URL到设置中
	if req.QuotaWarningType == dto.NotifyTypeBark {
		settings.BarkUrl = req.BarkUrl
	}

	// 如果是Gotify类型，添加Gotify配置到设置中
	if req.QuotaWarningType == dto.NotifyTypeGotify {
		settings.GotifyUrl = req.GotifyUrl
		settings.GotifyToken = req.GotifyToken
		// Gotify优先级范围0-10，超出范围则使用默认值5
		if req.GotifyPriority < 0 || req.GotifyPriority > 10 {
			settings.GotifyPriority = 5
		} else {
			settings.GotifyPriority = req.GotifyPriority
		}
	}

	// 更新用户设置
	user.SetSetting(settings)
	if err := user.Update(false); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "更新设置失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "设置已更新",
	})
}
