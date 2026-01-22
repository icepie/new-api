package model

import (
	"time"

	"gorm.io/gorm"
)

// ModelListing 模型上架状态表
type ModelListing struct {
	ModelName string    `gorm:"primaryKey;type:varchar(255)" json:"model_name"`
	IsListed  bool      `gorm:"default:true;index" json:"is_listed"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名
func (ModelListing) TableName() string {
	return "model_listings"
}

// GetModelListingStatus 获取单个模型的上架状态
func GetModelListingStatus(modelName string) (bool, error) {
	var listing ModelListing
	err := DB.Where("model_name = ?", modelName).First(&listing).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// 如果记录不存在，默认为已上架
			return true, nil
		}
		return false, err
	}
	return listing.IsListed, nil
}

// GetAllModelListingStatus 获取所有模型的上架状态
func GetAllModelListingStatus() (map[string]bool, error) {
	var listings []ModelListing
	err := DB.Find(&listings).Error
	if err != nil {
		return nil, err
	}

	statusMap := make(map[string]bool)
	for _, listing := range listings {
		statusMap[listing.ModelName] = listing.IsListed
	}
	return statusMap, nil
}

// SetModelListingStatus 设置单个模型的上架状态
func SetModelListingStatus(modelName string, isListed bool) error {
	listing := ModelListing{
		ModelName: modelName,
		IsListed:  isListed,
		UpdatedAt: time.Now(),
	}

	// 使用 GORM 的 Save 方法，如果记录存在则更新，不存在则创建
	return DB.Save(&listing).Error
}

// BatchSetModelListingStatus 批量设置模型的上架状态
func BatchSetModelListingStatus(modelNames []string, isListed bool) error {
	if len(modelNames) == 0 {
		return nil
	}

	// 使用事务批量更新
	return DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		for _, modelName := range modelNames {
			listing := ModelListing{
				ModelName: modelName,
				IsListed:  isListed,
				UpdatedAt: now,
			}
			if err := tx.Save(&listing).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// GetListedModels 获取所有已上架的模型列表
func GetListedModels() ([]string, error) {
	var listings []ModelListing
	err := DB.Where("is_listed = ?", true).Find(&listings).Error
	if err != nil {
		return nil, err
	}

	modelNames := make([]string, 0, len(listings))
	for _, listing := range listings {
		modelNames = append(modelNames, listing.ModelName)
	}
	return modelNames, nil
}

// DeleteModelListing 删除模型上架状态记录
func DeleteModelListing(modelName string) error {
	return DB.Where("model_name = ?", modelName).Delete(&ModelListing{}).Error
}
