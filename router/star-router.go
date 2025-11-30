package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
)

func SetStarRouter(router *gin.Engine) {
	// Star 用户系统接口 (当启用 Star 用户系统时)
	// 这些接口包装了 Star 后端，但返回 new-api 格式
	starRoute := router.Group("/u")
	starRoute.Use(gzip.Gzip(gzip.DefaultCompression))
	{
		starRoute.POST("/login", controller.StarLogin) // 添加登录接口包装
		starRoute.POST("/register", controller.StarRegister)
		starRoute.POST("/send_email", controller.StarSendEmail)
		starRoute.POST("/back_password", controller.StarBackPassword)
		starRoute.GET("/wechat_login_qr", controller.StarWechatLoginQR)
		// qr_login_status 接口需要频繁轮询，使用更宽松的限流策略
		// 允许每分钟 60 次请求（每 1 秒一次），足够支持 2 秒轮询
		starRoute.GET("/qr_login_status", middleware.QRStatusRateLimit(), controller.StarQRLoginStatus)
		// wechat_bind 接口在绑定场景下需要用户已登录，但登录场景不需要，所以不使用 UserAuth 中间件
		// 而是在函数内部检查 is_bind 参数来决定是否需要认证
		starRoute.POST("/wechat_bind", controller.StarWechatBind)
		starRoute.GET("/get_user_info", middleware.UserAuth(), controller.StarGetUserInfo)
		starRoute.POST("/change_user_info", middleware.UserAuth(), controller.StarChangeUserInfo)
	}
}

