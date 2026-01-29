package controller

import (
	"net/http"
	"strconv"

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
		Code:        form.Code,
		Name:        form.Name,
		Description: form.Description,
		Status:      form.Status,
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

	if err := org.Update(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "组织更新成功",
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
