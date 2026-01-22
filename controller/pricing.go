package controller

import (
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
)

func GetPricing(c *gin.Context) {
	pricing := model.GetPricing()
	userId, exists := c.Get("id")
	usableGroup := map[string]string{}
	groupRatio := map[string]float64{}
	for s, f := range ratio_setting.GetGroupRatioCopy() {
		groupRatio[s] = f
	}
	var group string
	if exists {
		user, err := model.GetUserCache(userId.(int))
		if err == nil {
			group = user.Group
			for g := range groupRatio {
				ratio, ok := ratio_setting.GetGroupGroupRatio(group, g)
				if ok {
					groupRatio[g] = ratio
				}
			}
		}
	}

	usableGroup = service.GetUserUsableGroups(group)
	// check groupRatio contains usableGroup
	for group := range ratio_setting.GetGroupRatioCopy() {
		if _, ok := usableGroup[group]; !ok {
			delete(groupRatio, group)
		}
	}

	c.JSON(200, gin.H{
		"success":            true,
		"data":               pricing,
		"vendors":            model.GetVendors(),
		"group_ratio":        groupRatio,
		"usable_group":       usableGroup,
		"supported_endpoint": model.GetSupportedEndpointMap(),
		"auto_groups":        service.GetUserAutoGroup(group),
	})
}

func ResetModelRatio(c *gin.Context) {
	defaultStr := ratio_setting.DefaultModelRatio2JSONString()
	err := model.UpdateOption("ModelRatio", defaultStr)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	err = ratio_setting.UpdateModelRatioByJSONString(defaultStr)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "重置模型倍率成功",
	})
}

// GetListedModels 获取已上架的模型列表
func GetListedModels(c *gin.Context) {
	modelNames, err := model.GetListedModels()
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": "获取上架模型列表失败: " + err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    modelNames,
	})
}

// BatchUpdateModelListing 批量更新模型上架状态
func BatchUpdateModelListing(c *gin.Context) {
	type BatchUpdateRequest struct {
		ModelNames []string `json:"model_names" binding:"required"`
		IsListed   bool     `json:"is_listed"`
	}

	var req BatchUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	if len(req.ModelNames) == 0 {
		c.JSON(200, gin.H{
			"success": false,
			"message": "模型列表不能为空",
		})
		return
	}

	err := model.BatchSetModelListingStatus(req.ModelNames, req.IsListed)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": "批量更新模型上架状态失败: " + err.Error(),
		})
		return
	}

	// 立即刷新 pricing 缓存
	model.RefreshPricingCache()

	action := "下架"
	if req.IsListed {
		action = "上架"
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "批量" + action + "模型成功",
	})
}
