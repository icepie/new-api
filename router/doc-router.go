package router

import (
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const docCDNOrigin = "https://nicerouterstatic.niceaigc.com"

// staticDocPrefixes are paths under /doc that should be proxied directly from CDN (no redirect).
var staticDocPrefixes = []string{"/assets/", "/workbox-", "/slimsearch.worker.js", "/favicon", "/logo", "/apple-touch-icon", "/robots.txt", "/sitemap", "/favicon-circle.png"}

// proxyDocPrefixes are paths that must be served inline (no redirect allowed by browser).
var proxyDocFiles = []string{"/service-worker.js", "/manifest.webmanifest"}

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

// stripDataTheme removes the data-theme attribute from the <html> tag so the
// client-side init script fully controls it, preventing Vue hydration mismatches.
func stripDataTheme(data []byte) []byte {
	s := strings.Replace(string(data), ` data-theme="light"`, "", 1)
	s = strings.Replace(s, ` data-theme="dark"`, "", 1)
	return []byte(s)
}

func SetDocRouter(router *gin.Engine, docPage func() []byte) {
	doc := router.Group("/doc")
	doc.GET("", func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", stripDataTheme(docPage()))
	})
	doc.GET("/*path", func(c *gin.Context) {
		path := c.Param("path")

		// service-worker.js and manifest.webmanifest must not redirect (browser blocks it)
		for _, f := range proxyDocFiles {
			if path == f {
				data, err := fetchDocHTML(path)
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

		for _, prefix := range staticDocPrefixes {
			if strings.HasPrefix(path, prefix) {
				c.Redirect(http.StatusMovedPermanently, docCDNOrigin+"/doc"+path)
				return
			}
		}
		// For HTML pages, fetch the specific page from CDN so each page has
		// its own correct HTML (VuePress MPA), preserving theme/dark-mode state.
		// VuePress generates: /foo/bar.html and /foo/bar/index.html (for dirs)
		var htmlPath string
		if strings.HasSuffix(path, "/") {
			htmlPath = path + "index.html"
		} else if strings.HasSuffix(path, ".html") {
			htmlPath = path
		} else {
			// try /foo/bar.html first, then /foo/bar/index.html
			htmlPath = path + ".html"
		}
		data, err := fetchDocHTML(htmlPath)
		if err != nil || data == nil {
			// try directory index as fallback
			data, err = fetchDocHTML(strings.TrimSuffix(path, ".html") + "/index.html")
		}
		if err != nil || data == nil {
			// fallback to cached index
			c.Header("Cache-Control", "no-cache")
			c.Data(http.StatusOK, "text/html; charset=utf-8", stripDataTheme(docPage()))
			return
		}
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", stripDataTheme(data))
	})
}
