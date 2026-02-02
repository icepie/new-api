package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// GetOrganizations 获取组织列表
func GetOrganizations(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("p"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if pageSize < 1 {
		pageSize = 10
	}

	keyword := c.Query("keyword")
	status := c.Query("status")

	// 获取当前用户信息
	userId := c.GetInt("id")
	userRole := c.GetInt("role")

	// 如果不是超级管理员，只能看到自己的组织
	var orgId int
	if userRole != 100 { // 100 是超级管理员
		user, err := model.GetUserById(userId, false)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "获取用户信息失败",
			})
			return
		}
		orgId = user.OrgId
	}

	orgs, total, err := model.GetAllOrganizations(page, pageSize, keyword, status, orgId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    orgs,
		"total":   total,
	})
}

// GetOrganization 获取单个组织
func GetOrganization(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的组织ID",
		})
		return
	}

	org, err := model.GetOrganizationById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    org,
	})
}

// CreateOrganization 创建组织
func CreateOrganization(c *gin.Context) {
	var form model.OrganizationForm
	if err := c.ShouldBindJSON(&form); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误: " + err.Error(),
		})
		return
	}

	org := &model.Organization{
		Code:                 form.Code,
		Name:                 form.Name,
		Description:          form.Description,
		Status:               form.Status,
		Remark:               form.Remark,
		BillingType:          form.BillingType,
		BillingCycle:         form.BillingCycle,
		Quota:                form.Quota,
		UsedQuota:            form.UsedQuota,
		OverdraftLimit:       form.OverdraftLimit,
		MaxSubAccounts:       form.MaxSubAccounts,
		MaxKeysPerSubAccount: form.MaxKeysPerSubAccount,
		MaxKeysPerOrg:        form.MaxKeysPerOrg,
	}

	if err := org.Insert(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "组织创建成功",
		"data":    org,
	})
}

// UpdateOrganization 更新组织
func UpdateOrganization(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的组织ID",
		})
		return
	}

	var form model.OrganizationForm
	if err := c.ShouldBindJSON(&form); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误: " + err.Error(),
		})
		return
	}

	org, err := model.GetOrganizationById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "组织不存在",
		})
		return
	}

	org.Code = form.Code
	org.Name = form.Name
	org.Description = form.Description
	org.Status = form.Status
	org.Remark = form.Remark
	org.BillingType = form.BillingType
	org.BillingCycle = form.BillingCycle
	org.Quota = form.Quota
	org.UsedQuota = form.UsedQuota
	org.OverdraftLimit = form.OverdraftLimit
	org.MaxSubAccounts = form.MaxSubAccounts
	org.MaxKeysPerSubAccount = form.MaxKeysPerSubAccount
	org.MaxKeysPerOrg = form.MaxKeysPerOrg

	if err := org.Update(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// 先同步组织的已用额度（从用户汇总）
	if err := model.SyncOrgUsedQuotaFromUsers(id); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "组织更新成功，但同步已用额度失败: " + err.Error(),
		})
		return
	}

	// 再同步组织内所有用户的额度
	if err := model.SyncUserQuotasFromOrg(id); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "组织更新成功，但同步用户额度失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "组织更新成功，已同步额度信息",
		"data":    org,
	})
}

// DeleteOrganization 删除组织
func DeleteOrganization(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "无效的组织ID",
		})
		return
	}

	org, err := model.GetOrganizationById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "组织不存在",
		})
		return
	}

	if err := org.Delete(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "组织删除成功",
	})
}

// GetOrganizationBilling 获取组织计费信息（包含用户使用详情）
func GetOrganizationBilling(c *gin.Context) {
	userId := c.GetInt("id")
	userRole := c.GetInt("role")

	// 获取用户信息
	user, err := model.GetUserById(userId, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取用户信息失败",
		})
		return
	}

	// 检查用户是否属于组织
	if user.OrgId == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "您不属于任何组织",
		})
		return
	}

	// 检查权限：必须是组织管理员(role=10)或超级管理员(role=100)
	if userRole != common.RoleAdminUser && userRole != common.RoleRootUser {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "无权访问组织计费信息",
		})
		return
	}

	// 获取组织信息
	org, err := model.GetOrganizationById(user.OrgId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取组织信息失败",
		})
		return
	}

	// 获取组织内所有用户的使用情况
	users, err := model.GetUsersByOrgId(user.OrgId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取用户列表失败",
		})
		return
	}

	// 构建用户使用详情列表
	type UserUsage struct {
		Id             int    `json:"id"`
		Username       string `json:"username"`
		DisplayName    string `json:"display_name"`
		Role           int    `json:"role"`
		UsedQuota      int    `json:"used_quota"`
		Quota          int    `json:"quota"`
		Status         int    `json:"status"`
		UnlimitedQuota bool   `json:"unlimited_quota"`
	}

	userUsages := make([]UserUsage, 0, len(users))
	for _, u := range users {
		userUsages = append(userUsages, UserUsage{
			Id:             u.Id,
			Username:       u.Username,
			DisplayName:    u.DisplayName,
			Role:           u.Role,
			UsedQuota:      u.UsedQuota,
			Quota:          u.Quota,
			Status:         u.Status,
			UnlimitedQuota: u.UnlimitedQuota,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"organization": org,
			"users":        userUsages,
		},
	})
}
