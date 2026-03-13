package router

import (
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const docCDNOrigin = "https://nicerouterstatic.niceaigc.com"

// staticDocPrefixes are paths under /doc that should be served directly from CDN.
var staticDocPrefixes = []string{"/assets/", "/service-worker.js", "/workbox-", "/slimsearch.worker.js", "/manifest.webmanifest", "/favicon", "/logo", "/apple-touch-icon", "/robots.txt", "/sitemap"}

var docHTTPClient = &http.Client{Timeout: 5 * time.Second}

func fetchDocHTML(path string) ([]byte, error) {
	url := docCDNOrigin + "/doc" + path
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Cache-Control", "no-cache")
	resp, err := docHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, nil
	}
	return io.ReadAll(resp.Body)
}

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
		// For HTML pages, fetch the specific page from CDN so each page has
		// its own correct HTML (VuePress MPA), preserving theme/dark-mode state.
		htmlPath := path
		if strings.HasSuffix(htmlPath, "/") {
			htmlPath += "index.html"
		} else if !strings.HasSuffix(htmlPath, ".html") {
			htmlPath += "/index.html"
		}
		data, err := fetchDocHTML(htmlPath)
		if err != nil || data == nil {
			// fallback to cached index
			c.Header("Cache-Control", "no-cache")
			c.Data(http.StatusOK, "text/html; charset=utf-8", docPage())
			return
		}
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", data)
	})
}
