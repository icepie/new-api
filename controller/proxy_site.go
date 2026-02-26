package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
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

// GetMySite 站点管理员获取自己管理的站点信息 (UserAuth + SiteAdminAuth)
func GetMySite(c *gin.Context) {
	siteId := c.GetInt("managed_site_id")
	site, err := model.GetProxySiteById(siteId)
	if err != nil {
		common.ApiErrorMsg(c, "未找到管理站点")
		return
	}
	c.JSON(200, gin.H{"success": true, "data": site})
}
