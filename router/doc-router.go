package router

import (
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const docCDNOrigin = "https://nicerouterstatic.niceaigc.com"

// staticDocPrefixes are paths that can be served via CDN redirect.
var staticDocPrefixes = []string{"/assets/", "/favicon", "/logo", "/apple-touch-icon", "/robots.txt", "/sitemap"}

// proxyDocFiles are paths that must be proxied inline (redirects not allowed by browser).
var proxyDocFiles = []string{"/service-worker.js", "/manifest.webmanifest"}

// proxyDocPrefixes are path prefixes that must be proxied inline.
var proxyDocPrefixes = []string{"/workbox-", "/slimsearch.worker.js", "/favicon-circle.png"}

var docHTTPClient = &http.Client{Timeout: 5 * time.Second}

func fetchDocResource(path string) ([]byte, error) {
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

// stripDataTheme removes the data-theme attribute from the <html> tag so the
// client-side init script fully controls it, preventing Vue hydration mismatches.
func stripDataTheme(data []byte) []byte {
	s := strings.Replace(string(data), ` data-theme="light"`, "", 1)
	s = strings.Replace(s, ` data-theme="dark"`, "", 1)
	return []byte(s)
}

func serveDocHTML(c *gin.Context, path string) {
	var htmlPath string
	if path == "" || path == "/" {
		htmlPath = "/index.html"
	} else if strings.HasSuffix(path, "/") {
		htmlPath = path + "index.html"
	} else if strings.HasSuffix(path, ".html") {
		htmlPath = path
	} else {
		htmlPath = path + ".html"
	}
	data, err := fetchDocResource(htmlPath)
	if err != nil || data == nil {
		// try directory index as fallback
		data, _ = fetchDocResource(strings.TrimSuffix(path, ".html") + "/index.html")
	}
	if data == nil {
		c.Redirect(http.StatusFound, docCDNOrigin+"/doc/")
		return
	}
	c.Header("Cache-Control", "no-cache")
	c.Data(http.StatusOK, "text/html; charset=utf-8", stripDataTheme(data))
}

func SetDocRouter(router *gin.Engine, _ func() []byte) {
	doc := router.Group("/doc")
	doc.GET("", func(c *gin.Context) {
		serveDocHTML(c, "/")
	})
	doc.GET("/*path", func(c *gin.Context) {
		path := c.Param("path")

		// Paths that must be proxied inline (no redirect allowed)
		for _, f := range proxyDocFiles {
			if path == f {
				data, err := fetchDocResource(path)
				if err != nil || data == nil {
					c.Status(http.StatusNotFound)
					return
				}
				contentType := "application/javascript"
				if strings.HasSuffix(path, ".webmanifest") {
					contentType = "application/manifest+json"
				}
				c.Header("Cache-Control", "no-cache")
				c.Data(http.StatusOK, contentType, data)
				return
			}
		}
		for _, p := range proxyDocPrefixes {
			if strings.HasPrefix(path, p) {
				data, err := fetchDocResource(path)
				if err != nil || data == nil {
					c.Status(http.StatusNotFound)
					return
				}
				contentType := "application/javascript"
				if strings.HasSuffix(path, ".png") {
					contentType = "image/png"
				}
				c.Header("Cache-Control", "no-cache")
				c.Data(http.StatusOK, contentType, data)
				return
			}
		}

		// Static assets: redirect to CDN
		for _, prefix := range staticDocPrefixes {
			if strings.HasPrefix(path, prefix) {
				c.Redirect(http.StatusMovedPermanently, docCDNOrigin+"/doc"+path)
				return
			}
		}

		// HTML pages: fetch from CDN directly (never use cached docPage)
		serveDocHTML(c, path)
	})
}
