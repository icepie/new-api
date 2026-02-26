package middleware

import (
	"net/http"

	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

// SiteAdminAuth 验证用户是否为某站点的管理员
// 通过后在 context 中设置 "managed_site_id"
func SiteAdminAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		userId := c.GetInt("id")
		if userId == 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "未登录",
			})
			c.Abort()
			return
		}
		siteId := service.GetManagedSiteIdByUserId(userId)
		if siteId == 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "权限不足，非站点管理员",
			})
			c.Abort()
			return
		}
		c.Set("managed_site_id", siteId)
		c.Next()
	}
}
