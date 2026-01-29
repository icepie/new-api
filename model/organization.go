package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

const (
	OrgStatusEnabled  = "enabled"
	OrgStatusDisabled = "disabled"
)

// Organization 组织模型
type Organization struct {
	ID          int            `json:"id" gorm:"primarykey"`
	Code        string         `json:"code" gorm:"type:varchar(32);uniqueIndex;not null"` // 组织代码(唯一)
	Name        string         `json:"name" gorm:"type:varchar(128);index;not null"`      // 组织名称
	Description string         `json:"description" gorm:"type:varchar(1024)"`             // 组织描述
	Status      string         `json:"status" gorm:"type:varchar(20);index;default:'enabled'"` // 状态(enabled/disabled)
	CreatedAt   time.Time      `json:"created_at" gorm:"index"`
	UpdatedAt   time.Time      `json:"updated_at" gorm:"index"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// OrganizationQueryParam 组织查询参数
type OrganizationQueryParam struct {
	Code   string `form:"code"`
	Name   string `form:"name"`
	Status string `form:"status" binding:"oneof=enabled disabled ''"`
}

// OrganizationForm 组织表单
type OrganizationForm struct {
	Code        string `json:"code" binding:"required,max=32"`
	Name        string `json:"name" binding:"required,max=128"`
	Description string `json:"description" binding:"max=1024"`
	Status      string `json:"status" binding:"required,oneof=enabled disabled"`
}

func (o *Organization) TableName() string {
	return "organizations"
}

// GetAllOrganizations 获取所有组织
func GetAllOrganizations(page, pageSize int, keyword string, status string, orgId int) ([]*Organization, int64, error) {
	var orgs []*Organization
	var total int64

	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	query := tx.Model(&Organization{})

	// 如果指定了组织ID，只查询该组织
	if orgId > 0 {
		query = query.Where("id = ?", orgId)
	}

	// 关键字搜索
	if keyword != "" {
		query = query.Where("code LIKE ? OR name LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	// 状态过滤
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	// 分页查询
	offset := (page - 1) * pageSize
	if err := query.Order("id desc").Limit(pageSize).Offset(offset).Find(&orgs).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return orgs, total, nil
}

// GetOrganizationById 根据ID获取组织
func GetOrganizationById(id int) (*Organization, error) {
	if id == 0 {
		return nil, errors.New("id 为空")
	}
	var org Organization
	err := DB.First(&org, "id = ?", id).Error
	return &org, err
}

// GetOrganizationByCode 根据代码获取组织
func GetOrganizationByCode(code string) (*Organization, error) {
	if code == "" {
		return nil, errors.New("code 为空")
	}
	var org Organization
	err := DB.First(&org, "code = ?", code).Error
	return &org, err
}

// Insert 创建组织
func (o *Organization) Insert() error {
	// 检查代码是否已存在
	var count int64
	if err := DB.Model(&Organization{}).Where("code = ?", o.Code).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("组织代码已存在")
	}

	return DB.Create(o).Error
}

// Update 更新组织
func (o *Organization) Update() error {
	if o.ID == 0 {
		return errors.New("id 为空")
	}

	// 检查代码是否与其他组织冲突
	var count int64
	if err := DB.Model(&Organization{}).Where("code = ? AND id != ?", o.Code, o.ID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("组织代码已被其他组织使用")
	}

	return DB.Model(&Organization{}).Where("id = ?", o.ID).Updates(map[string]interface{}{
		"code":        o.Code,
		"name":        o.Name,
		"description": o.Description,
		"status":      o.Status,
	}).Error
}

// Delete 删除组织
func (o *Organization) Delete() error {
	if o.ID == 0 {
		return errors.New("id 为空")
	}

	// 检查是否有用户关联
	var userCount int64
	if err := DB.Model(&User{}).Where("org_id = ?", o.ID).Count(&userCount).Error; err != nil {
		return err
	}
	if userCount > 0 {
		return errors.New("该组织下还有用户,无法删除")
	}

	return DB.Delete(o).Error
}

// IsOrganizationEnabled 检查组织是否启用
func IsOrganizationEnabled(orgId int) (bool, error) {
	var org Organization
	err := DB.Select("status").First(&org, "id = ?", orgId).Error
	if err != nil {
		return false, err
	}
	return org.Status == OrgStatusEnabled, nil
}
