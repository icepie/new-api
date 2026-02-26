package model

import (
	"github.com/QuantumNous/new-api/common"
)

type ProxySite struct {
	Id           int     `json:"id" gorm:"primarykey"`
	Domain       string  `json:"domain" gorm:"type:varchar(256);uniqueIndex"`
	Name         string  `json:"name" gorm:"type:varchar(128)"`
	Logo         string  `json:"logo" gorm:"type:text"`
	Announcement string  `json:"announcement" gorm:"type:text"`
	RebateRatio  float64 `json:"rebate_ratio" gorm:"default:1.0"`
	AdminUserId  int     `json:"admin_user_id" gorm:"index"`
	Remark       string  `json:"remark" gorm:"type:text"`
	Status       int     `json:"status" gorm:"default:1"` // 1=启用 0=禁用
	CreatedTime  int64   `json:"created_time"`
}

func GetAllProxySites() ([]*ProxySite, error) {
	var sites []*ProxySite
	err := DB.Order("id desc").Find(&sites).Error
	return sites, err
}

func GetProxySiteById(id int) (*ProxySite, error) {
	var site ProxySite
	err := DB.Where("id = ?", id).First(&site).Error
	return &site, err
}

func GetProxySiteByDomain(domain string) (*ProxySite, error) {
	var site ProxySite
	err := DB.Where("domain = ? AND status = 1", domain).First(&site).Error
	if err != nil {
		return nil, err
	}
	return &site, nil
}

func GetProxySiteByAdminUserId(userId int) (*ProxySite, error) {
	var site ProxySite
	err := DB.Where("admin_user_id = ?", userId).First(&site).Error
	if err != nil {
		return nil, err
	}
	return &site, nil
}

func (site *ProxySite) Insert() error {
	site.CreatedTime = common.GetTimestamp()
	return DB.Create(site).Error
}

func (site *ProxySite) Update() error {
	return DB.Save(site).Error
}

func DeleteProxySiteById(id int) error {
	return DB.Where("id = ?", id).Delete(&ProxySite{}).Error
}
