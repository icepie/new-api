package service

import (
	"sync"
	"time"

	"github.com/QuantumNous/new-api/model"
)

// 简单的内存缓存：domain -> site_id (0 表示无对应站点)
type domainSiteCache struct {
	mu      sync.RWMutex
	data    map[string]int
	expires map[string]time.Time
}

var siteCache = &domainSiteCache{
	data:    make(map[string]int),
	expires: make(map[string]time.Time),
}

const siteCacheTTL = 5 * time.Minute

func GetSiteIdByDomain(domain string) int {
	// 1. 查缓存
	siteCache.mu.RLock()
	if id, ok := siteCache.data[domain]; ok {
		if time.Now().Before(siteCache.expires[domain]) {
			siteCache.mu.RUnlock()
			return id
		}
	}
	siteCache.mu.RUnlock()

	// 2. 查数据库
	site, err := model.GetProxySiteByDomain(domain)
	siteId := 0
	if err == nil && site != nil {
		siteId = site.Id
	}

	// 3. 写缓存
	siteCache.mu.Lock()
	siteCache.data[domain] = siteId
	siteCache.expires[domain] = time.Now().Add(siteCacheTTL)
	siteCache.mu.Unlock()

	return siteId
}

// 站点管理员缓存：userId -> siteId (0 表示非站点管理员)
type userSiteAdminCache struct {
	mu      sync.RWMutex
	data    map[int]int
	expires map[int]time.Time
}

var siteAdminCache = &userSiteAdminCache{
	data:    make(map[int]int),
	expires: make(map[int]time.Time),
}

func GetManagedSiteIdByUserId(userId int) int {
	siteAdminCache.mu.RLock()
	if id, ok := siteAdminCache.data[userId]; ok {
		if time.Now().Before(siteAdminCache.expires[userId]) {
			siteAdminCache.mu.RUnlock()
			return id
		}
	}
	siteAdminCache.mu.RUnlock()

	site, err := model.GetProxySiteByAdminUserId(userId)
	siteId := 0
	if err == nil && site != nil && site.Status == 1 {
		siteId = site.Id
	}

	siteAdminCache.mu.Lock()
	siteAdminCache.data[userId] = siteId
	siteAdminCache.expires[userId] = time.Now().Add(siteCacheTTL)
	siteAdminCache.mu.Unlock()

	return siteId
}

// 站点信息变更时清除缓存
func InvalidateSiteCache(domain string, adminUserId int) {
	siteCache.mu.Lock()
	delete(siteCache.data, domain)
	delete(siteCache.expires, domain)
	siteCache.mu.Unlock()

	siteAdminCache.mu.Lock()
	delete(siteAdminCache.data, adminUserId)
	delete(siteAdminCache.expires, adminUserId)
	siteAdminCache.mu.Unlock()
}
