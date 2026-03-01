package controller

import (
	"fmt"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/console_setting"
	"github.com/gin-gonic/gin"
)

// GetAllProxySites 获取全部代理站点列表 (RootAuth)
func GetAllProxySites(c *gin.Context) {
	sites, err := model.GetAllProxySites()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(200, gin.H{"success": true, "data": sites})
}

// CreateProxySite 创建代理站点 (RootAuth)
func CreateProxySite(c *gin.Context) {
	var site model.ProxySite
	if err := common.DecodeJson(c.Request.Body, &site); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}
	if site.Domain == "" {
		common.ApiErrorMsg(c, "站点域名不能为空")
		return
	}
	if err := site.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(200, gin.H{"success": true, "data": site})
}

// UpdateProxySite 更新代理站点 (RootAuth)
func UpdateProxySite(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}
	existing, err := model.GetProxySiteById(id)
	if err != nil {
		common.ApiErrorMsg(c, "站点不存在")
		return
	}

	var site model.ProxySite
	if err := common.DecodeJson(c.Request.Body, &site); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	// 清除旧域名和旧管理员的缓存
	service.InvalidateSiteCache(existing.Domain, existing.AdminUserId)

	existing.Domain = site.Domain
	existing.Name = site.Name
	existing.Logo = site.Logo
	existing.Announcement = site.Announcement
	existing.RebateRatio = site.RebateRatio
	existing.AdminUserId = site.AdminUserId
	existing.Remark = site.Remark
	existing.Status = site.Status

	if err := existing.Update(); err != nil {
		common.ApiError(c, err)
		return
	}
	// Also invalidate new domain and new admin user ID
	service.InvalidateSiteCache(existing.Domain, existing.AdminUserId)
	c.JSON(200, gin.H{"success": true, "data": existing})
}

// DeleteProxySite 删除代理站点 (RootAuth)
func DeleteProxySite(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}
	existing, err := model.GetProxySiteById(id)
	if err != nil {
		common.ApiErrorMsg(c, "站点不存在")
		return
	}
	service.InvalidateSiteCache(existing.Domain, existing.AdminUserId)

	if err := model.DeleteProxySiteById(id); err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(200, gin.H{"success": true})
}

// GetMySite 获取当前用户管理的站点信息，非站点管理员返回 null（不报错）
func GetMySite(c *gin.Context) {
	userId := c.GetInt("id")
	siteId := service.GetManagedSiteIdByUserId(userId)
	if siteId == 0 {
		c.JSON(200, gin.H{"success": true, "data": nil})
		return
	}
	site, err := model.GetProxySiteById(siteId)
	if err != nil {
		c.JSON(200, gin.H{"success": true, "data": nil})
		return
	}
	c.JSON(200, gin.H{"success": true, "data": site})
}

// GetSiteUsers 站点管理员查看本站用户 (SiteAdminAuth)
func GetSiteUsers(c *gin.Context) {
	siteId := c.GetInt("managed_site_id")
	pageInfo := common.GetPageQuery(c)
	users, total, err := model.GetUsersBySiteId(siteId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"data":    users,
		"total":   total,
	})
}

// GetSiteTopUps 站点管理员查看本站充值记录 (SiteAdminAuth)
func GetSiteTopUps(c *gin.Context) {
	siteId := c.GetInt("managed_site_id")
	pageInfo := common.GetPageQuery(c)
	topups, total, err := model.GetTopUpsBySiteId(siteId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"data":    topups,
		"total":   total,
	})
}

// validateSiteAnnouncements validates a JSON string of announcements array
func validateSiteAnnouncements(jsonStr string) error {
	if jsonStr == "" {
		return nil
	}
	if err := console_setting.ValidateConsoleSettings(jsonStr, "Announcements"); err != nil {
		return fmt.Errorf("公告数据验证失败：%s", err.Error())
	}
	return nil
}

// GetProxySiteAnnouncements 获取代理站点公告列表 (RootAuth)
func GetProxySiteAnnouncements(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}
	existing, err := model.GetProxySiteById(id)
	if err != nil {
		common.ApiErrorMsg(c, "站点不存在")
		return
	}
	// Return parsed array or empty array
	if existing.Announcements == "" {
		c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
		return
	}
	var announcements []interface{}
	if err := common.Unmarshal([]byte(existing.Announcements), &announcements); err != nil {
		c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
		return
	}
	c.JSON(200, gin.H{"success": true, "data": announcements})
}

// UpdateProxySiteAnnouncements 更新代理站点公告列表 (RootAuth)
func UpdateProxySiteAnnouncements(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}
	existing, err := model.GetProxySiteById(id)
	if err != nil {
		common.ApiErrorMsg(c, "站点不存在")
		return
	}

	var body struct {
		Announcements string `json:"announcements"`
	}
	if err := common.DecodeJson(c.Request.Body, &body); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	if err := validateSiteAnnouncements(body.Announcements); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	existing.Announcements = body.Announcements
	if err := existing.Update(); err != nil {
		common.ApiError(c, err)
		return
	}
	service.InvalidateSiteCache(existing.Domain, existing.AdminUserId)
	c.JSON(200, gin.H{"success": true})
}

// GetSiteAnnouncements 站点管理员获取本站公告 (SiteAdminAuth)
func GetSiteAnnouncements(c *gin.Context) {
	siteId := c.GetInt("managed_site_id")
	site, err := model.GetProxySiteById(siteId)
	if err != nil {
		common.ApiErrorMsg(c, "站点不存在")
		return
	}
	if site.Announcements == "" {
		c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
		return
	}
	var announcements []interface{}
	if err := common.Unmarshal([]byte(site.Announcements), &announcements); err != nil {
		c.JSON(200, gin.H{"success": true, "data": []interface{}{}})
		return
	}
	c.JSON(200, gin.H{"success": true, "data": announcements})
}

// UpdateSiteAnnouncements 站点管理员更新本站公告 (SiteAdminAuth)
func UpdateSiteAnnouncements(c *gin.Context) {
	siteId := c.GetInt("managed_site_id")
	site, err := model.GetProxySiteById(siteId)
	if err != nil {
		common.ApiErrorMsg(c, "站点不存在")
		return
	}

	var body struct {
		Announcements string `json:"announcements"`
	}
	if err := common.DecodeJson(c.Request.Body, &body); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	if err := validateSiteAnnouncements(body.Announcements); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	site.Announcements = body.Announcements
	if err := site.Update(); err != nil {
		common.ApiError(c, err)
		return
	}
	service.InvalidateSiteCache(site.Domain, site.AdminUserId)
	c.JSON(200, gin.H{"success": true})
}
