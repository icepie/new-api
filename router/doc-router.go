package router

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const docCDNOrigin = "https://nicerouterstatic.niceaigc.com"

// staticDocPrefixes are paths under /doc that should be served directly from CDN.
var staticDocPrefixes = []string{"/assets/", "/service-worker.js", "/workbox-", "/slimsearch.worker.js", "/manifest.webmanifest", "/favicon", "/logo", "/apple-touch-icon", "/robots.txt", "/sitemap"}

func SetDocRouter(router *gin.Engine, docPage func() []byte) {
	doc := router.Group("/doc")
	doc.GET("", func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", docPage())
	})
	doc.GET("/*path", func(c *gin.Context) {
		path := c.Param("path")
		for _, prefix := range staticDocPrefixes {
			if strings.HasPrefix(path, prefix) {
				c.Redirect(http.StatusMovedPermanently, docCDNOrigin+"/doc"+path)
				return
			}
		}
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", docPage())
	})
}
