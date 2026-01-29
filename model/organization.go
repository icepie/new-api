package model

import (
	"errors"
	"fmt"
	"time"

	"github.com/QuantumNous/new-api/logger"
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
	Remark      string         `json:"remark" gorm:"type:varchar(1024)"`                  // 备注

	// 计费相关字段（仅用于记录和显示）
	BillingType  string `json:"billing_type" gorm:"type:varchar(20);default:'prepaid'"`   // prepaid(预付费) / postpaid(后付费)
	BillingCycle string `json:"billing_cycle" gorm:"type:varchar(20);default:'monthly'"`  // monthly(月付) / quarterly(季付) / yearly(年付)

	// 额度字段
	Quota         int `json:"quota" gorm:"default:0"`          // 剩余额度（预付费使用）
	UsedQuota     int `json:"used_quota" gorm:"default:0"`     // 已用额度
	OverdraftLimit int `json:"overdraft_limit" gorm:"default:0"` // 透支额度上限（后付费使用）

	// 限制项字段（-1 表示无限制）
	MaxSubAccounts       int `json:"max_sub_accounts" gorm:"default:10"`        // 子账号总数上限
	MaxKeysPerSubAccount int `json:"max_keys_per_sub_account" gorm:"default:5"` // 每个子账号的密钥数上限
	MaxKeysPerOrg        int `json:"max_keys_per_org" gorm:"default:50"`        // 组织内密钥总数上限

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
	Code                 string `json:"code" binding:"required,max=32"`
	Name                 string `json:"name" binding:"required,max=128"`
	Description          string `json:"description" binding:"max=1024"`
	Status               string `json:"status" binding:"required,oneof=enabled disabled"`
	Remark               string `json:"remark" binding:"max=1024"`
	BillingType          string `json:"billing_type" binding:"required,oneof=prepaid postpaid"`
	BillingCycle         string `json:"billing_cycle" binding:"required,oneof=monthly quarterly yearly"`
	Quota                int    `json:"quota" binding:"min=0"`
	UsedQuota            int    `json:"used_quota" binding:"min=0"`
	OverdraftLimit       int    `json:"overdraft_limit" binding:"min=0"`
	MaxSubAccounts       int    `json:"max_sub_accounts" binding:"min=-1"`
	MaxKeysPerSubAccount int    `json:"max_keys_per_sub_account" binding:"min=-1"`
	MaxKeysPerOrg        int    `json:"max_keys_per_org" binding:"min=-1"`
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
		"code":                     o.Code,
		"name":                     o.Name,
		"description":              o.Description,
		"status":                   o.Status,
		"remark":                   o.Remark,
		"billing_type":             o.BillingType,
		"billing_cycle":            o.BillingCycle,
		"quota":                    o.Quota,
		"used_quota":               o.UsedQuota,
		"overdraft_limit":          o.OverdraftLimit,
		"max_sub_accounts":         o.MaxSubAccounts,
		"max_keys_per_sub_account": o.MaxKeysPerSubAccount,
		"max_keys_per_org":         o.MaxKeysPerOrg,
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

// CountSubAccounts 统计组织的子账号数量（只统计 role=1 的普通用户）
func CountSubAccounts(orgId int) (int64, error) {
	var count int64
	err := DB.Model(&User{}).Where("org_id = ? AND role = ? AND deleted_at IS NULL", orgId, 1).Count(&count).Error
	return count, err
}

// CountOrgTokens 统计组织的令牌总数
func CountOrgTokens(orgId int) (int64, error) {
	var count int64
	err := DB.Table("tokens").
		Joins("INNER JOIN users ON users.id = tokens.user_id").
		Where("users.org_id = ? AND users.deleted_at IS NULL", orgId).
		Count(&count).Error
	return count, err
}

// CheckOrgLimits 检查组织限制（创建用户时调用）
func CheckOrgLimits(orgId int) error {
	if orgId == 0 {
		// org_id = 0 表示不属于任何组织，不受限制
		return nil
	}

	org, err := GetOrganizationById(orgId)
	if err != nil {
		return err
	}

	// 检查子账号数量限制（-1 表示无限制）
	if org.MaxSubAccounts != -1 {
		count, err := CountSubAccounts(orgId)
		if err != nil {
			return err
		}
		if count >= int64(org.MaxSubAccounts) {
			return errors.New("该组织子账号数已达上限（当前 " + fmt.Sprintf("%d", count) + "/最大 " + fmt.Sprintf("%d", org.MaxSubAccounts) + "）")
		}
	}

	return nil
}

// CheckTokenLimits 检查令牌限制（创建令牌时调用）
func CheckTokenLimits(userId int) error {
	user, err := GetUserById(userId, false)
	if err != nil {
		return err
	}

	if user.OrgId == 0 {
		// org_id = 0 表示不属于任何组织，不受限制
		return nil
	}

	org, err := GetOrganizationById(user.OrgId)
	if err != nil {
		return err
	}

	// 检查用户令牌数量限制（-1 表示无限制）
	if org.MaxKeysPerSubAccount != -1 {
		userTokenCount, err := CountUserTokens(userId)
		if err != nil {
			return err
		}
		if userTokenCount >= int64(org.MaxKeysPerSubAccount) {
			return errors.New("该用户令牌数已达上限（当前 " + fmt.Sprintf("%d", userTokenCount) + "/最大 " + fmt.Sprintf("%d", org.MaxKeysPerSubAccount) + "）")
		}
	}

	// 检查组织令牌总数限制（-1 表示无限制）
	if org.MaxKeysPerOrg != -1 {
		orgTokenCount, err := CountOrgTokens(user.OrgId)
		if err != nil {
			return err
		}
		if orgTokenCount >= int64(org.MaxKeysPerOrg) {
			return errors.New("该组织令牌总数已达上限（当前 " + fmt.Sprintf("%d", orgTokenCount) + "/最大 " + fmt.Sprintf("%d", org.MaxKeysPerOrg) + "）")
		}
	}

	return nil
}

// CheckOrgQuota 检查组织额度是否足够
func CheckOrgQuota(orgId int, quotaNeeded int) error {
	if orgId == 0 {
		// org_id = 0 表示不属于任何组织，不受组织额度限制
		return nil
	}

	org, err := GetOrganizationById(orgId)
	if err != nil {
		return err
	}

	// 检查组织状态
	if org.Status != OrgStatusEnabled {
		return errors.New("该组织已被禁用")
	}

	// 根据计费类型检查额度
	if org.BillingType == "prepaid" {
		// 预付费：检查剩余额度是否足够
		if org.Quota < quotaNeeded {
			return fmt.Errorf("组织额度不足，剩余额度: %s", logger.FormatQuota(org.Quota))
		}
	} else if org.BillingType == "postpaid" {
		// 后付费：检查是否超过总可用额度（基础额度 + 透支上限）
		// 总可用额度 = quota + overdraft_limit
		// 已用额度 = used_quota
		// 可用额度 = (quota + overdraft_limit) - used_quota
		totalAvailable := org.Quota + org.OverdraftLimit
		available := totalAvailable - org.UsedQuota
		if available < quotaNeeded {
			return fmt.Errorf("组织额度不足，可用额度: %s, 总额度: %s", logger.FormatQuota(available), logger.FormatQuota(totalAvailable))
		}
	}

	return nil
}

// DeductOrgQuota 扣除组织额度
func DeductOrgQuota(orgId int, quotaUsed int) error {
	if orgId == 0 {
		// org_id = 0 表示不属于任何组织，不扣除组织额度
		return nil
	}

	org, err := GetOrganizationById(orgId)
	if err != nil {
		return err
	}

	// 根据计费类型扣除额度
	if org.BillingType == "prepaid" {
		// 预付费：从剩余额度中扣除
		return DB.Model(&Organization{}).Where("id = ?", orgId).Updates(map[string]interface{}{
			"quota":      gorm.Expr("quota - ?", quotaUsed),
			"used_quota": gorm.Expr("used_quota + ?", quotaUsed),
		}).Error
	} else if org.BillingType == "postpaid" {
		// 后付费：只增加已用额度
		return DB.Model(&Organization{}).Where("id = ?", orgId).Update("used_quota", gorm.Expr("used_quota + ?", quotaUsed)).Error
	}

	return nil
}

// SyncUserQuotasFromOrg 同步组织内所有用户的额度到组织额度
func SyncUserQuotasFromOrg(orgId int) error {
	if orgId == 0 {
		return nil
	}

	org, err := GetOrganizationById(orgId)
	if err != nil {
		return err
	}

	// 计算用户应该获得的额度
	var userQuota int
	if org.BillingType == "prepaid" {
		// 预付费：用户额度 = 组织剩余额度
		userQuota = org.Quota
	} else if org.BillingType == "postpaid" {
		// 后付费：用户额度 = 组织基础额度 + 透支上限
		userQuota = org.Quota + org.OverdraftLimit
	}

	// 批量更新该组织内所有用户的额度（保留已用额度，只更新剩余额度）
	return DB.Model(&User{}).Where("org_id = ?", orgId).Update("quota", userQuota).Error
}

// SyncOrgUsedQuotaFromUsers 从用户的已用额度同步到组织的已用额度
func SyncOrgUsedQuotaFromUsers(orgId int) error {
	if orgId == 0 {
		return nil
	}

	// 计算该组织内所有用户的已用额度总和
	var totalUsedQuota int64
	err := DB.Model(&User{}).
		Where("org_id = ?", orgId).
		Select("COALESCE(SUM(used_quota), 0)").
		Scan(&totalUsedQuota).Error

	if err != nil {
		return err
	}

	// 更新组织的已用额度
	return DB.Model(&Organization{}).
		Where("id = ?", orgId).
		Update("used_quota", totalUsedQuota).Error
}
