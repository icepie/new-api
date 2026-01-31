package model

import (
	"time"

	"gorm.io/gorm"
)

// ModelListing 模型上架状态表（含官方价格、类型、标签）
type ModelListing struct {
	ModelName          string     `gorm:"primaryKey;type:varchar(255)" json:"model_name"`
	IsListed           bool       `gorm:"default:true;index" json:"is_listed"`
	OfficialPriceUnit   *float64  `gorm:"type:decimal(20,6)" json:"official_price_unit,omitempty"`
	OfficialInputPrice  *float64  `gorm:"type:decimal(20,6)" json:"official_input_price,omitempty"`
	OfficialOutputPrice *float64  `gorm:"type:decimal(20,6)" json:"official_output_price,omitempty"`
	ListTypes           *string   `gorm:"column:list_types;type:text" json:"list_types,omitempty"`   // 类型，逗号分隔
	ListTags            *string   `gorm:"column:list_tags;type:text" json:"list_tags,omitempty"`     // 标签，逗号分隔
	UpdatedAt           time.Time `json:"updated_at"`
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

// ModelOfficialPrice 单个模型的官方价格（用于定价组装）
type ModelOfficialPrice struct {
	Unit   *float64
	Input  *float64
	Output *float64
}

// ModelListingMeta 单个模型的类型与标签（用于定价组装）
type ModelListingMeta struct {
	ListTypes *string
	ListTags  *string
}

// GetAllModelListingWithOfficialPrices 获取所有模型的上架状态、官方价格、类型与标签
func GetAllModelListingWithOfficialPrices() (
	statusMap map[string]bool,
	officialMap map[string]ModelOfficialPrice,
	metaMap map[string]ModelListingMeta,
	err error,
) {
	var listings []ModelListing
	if err = DB.Find(&listings).Error; err != nil {
		return nil, nil, nil, err
	}
	statusMap = make(map[string]bool)
	officialMap = make(map[string]ModelOfficialPrice)
	metaMap = make(map[string]ModelListingMeta)
	for _, listing := range listings {
		statusMap[listing.ModelName] = listing.IsListed
		if listing.OfficialPriceUnit != nil || listing.OfficialInputPrice != nil || listing.OfficialOutputPrice != nil {
			officialMap[listing.ModelName] = ModelOfficialPrice{
				Unit:   listing.OfficialPriceUnit,
				Input:  listing.OfficialInputPrice,
				Output: listing.OfficialOutputPrice,
			}
		}
		if listing.ListTypes != nil || listing.ListTags != nil {
			metaMap[listing.ModelName] = ModelListingMeta{
				ListTypes: listing.ListTypes,
				ListTags:  listing.ListTags,
			}
		}
	}
	return statusMap, officialMap, metaMap, nil
}

// SetModelOfficialPrice 设置单个模型的官方价格（仅更新官方价格字段，不影响上架状态）
func SetModelOfficialPrice(modelName string, unit, input, output *float64) error {
	var listing ModelListing
	err := DB.Where("model_name = ?", modelName).First(&listing).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}
	listing.ModelName = modelName
	listing.UpdatedAt = time.Now()
	if unit != nil {
		listing.OfficialPriceUnit = unit
	}
	if input != nil {
		listing.OfficialInputPrice = input
	}
	if output != nil {
		listing.OfficialOutputPrice = output
	}
	// 若记录不存在，默认上架
	if err == gorm.ErrRecordNotFound {
		listing.IsListed = true
	}
	return DB.Save(&listing).Error
}

// SetModelTypesAndTags 设置单个模型的类型与标签（仅更新 list_types/list_tags）
func SetModelTypesAndTags(modelName string, listTypes, listTags *string) error {
	var listing ModelListing
	err := DB.Where("model_name = ?", modelName).First(&listing).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}
	listing.ModelName = modelName
	listing.UpdatedAt = time.Now()
	if listTypes != nil {
		listing.ListTypes = listTypes
	}
	if listTags != nil {
		listing.ListTags = listTags
	}
	if err == gorm.ErrRecordNotFound {
		listing.IsListed = true
	}
	return DB.Save(&listing).Error
}

// SetModelListingStatus 设置单个模型的上架状态（仅更新 is_listed，不覆盖官方价格等字段）
func SetModelListingStatus(modelName string, isListed bool) error {
	now := time.Now()
	res := DB.Model(&ModelListing{}).Where("model_name = ?", modelName).Updates(map[string]interface{}{
		"is_listed":  isListed,
		"updated_at": now,
	})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		// 记录不存在则创建，仅含上架状态
		return DB.Create(&ModelListing{
			ModelName: modelName,
			IsListed:  isListed,
			UpdatedAt: now,
		}).Error
	}
	return nil
}

// BatchSetModelListingStatus 批量设置模型的上架状态（仅更新 is_listed，不覆盖官方价格等字段）
func BatchSetModelListingStatus(modelNames []string, isListed bool) error {
	if len(modelNames) == 0 {
		return nil
	}

	now := time.Now()
	return DB.Transaction(func(tx *gorm.DB) error {
		for _, modelName := range modelNames {
			res := tx.Model(&ModelListing{}).Where("model_name = ?", modelName).Updates(map[string]interface{}{
				"is_listed":  isListed,
				"updated_at": now,
			})
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				if err := tx.Create(&ModelListing{
					ModelName: modelName,
					IsListed:  isListed,
					UpdatedAt: now,
				}).Error; err != nil {
					return err
				}
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
