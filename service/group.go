package service

import (
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
)

func GetUserUsableGroups(userGroup string) map[string]string {
	groupsCopy := setting.GetUserUsableGroupsCopy()
	if userGroup != "" {
		specialSettings, b := ratio_setting.GetGroupRatioSetting().GroupSpecialUsableGroup.Get(userGroup)
		if b {
			// 处理特殊可用分组
			for specialGroup, desc := range specialSettings {
				if strings.HasPrefix(specialGroup, "-:") {
					// 移除分组
					groupToRemove := strings.TrimPrefix(specialGroup, "-:")
					delete(groupsCopy, groupToRemove)
				} else if strings.HasPrefix(specialGroup, "+:") {
					// 添加分组
					groupToAdd := strings.TrimPrefix(specialGroup, "+:")
					groupsCopy[groupToAdd] = desc
				} else {
					// 直接添加分组
					groupsCopy[specialGroup] = desc
				}
			}
		}
		// 如果userGroup不在UserUsableGroups中，返回UserUsableGroups + userGroup
		if _, ok := groupsCopy[userGroup]; !ok {
			groupsCopy[userGroup] = "用户分组"
		}
	}
	return groupsCopy
}

func GroupInUserUsableGroups(userGroup, groupName string) bool {
	_, ok := GetUserUsableGroups(userGroup)[groupName]
	return ok
}

// GetUserAutoGroup 根据用户分组获取自动分组设置
func GetUserAutoGroup(userGroup string) []string {
	groups := GetUserUsableGroups(userGroup)
	autoGroups := make([]string, 0)
	for _, group := range setting.GetAutoGroups() {
		if _, ok := groups[group]; ok {
			autoGroups = append(autoGroups, group)
		}
	}
	return autoGroups
}

// GetUserGroupRatio 获取用户使用某个分组的倍率
// userGroup 用户分组
// group 需要获取倍率的分组
func GetUserGroupRatio(userGroup, group string) float64 {
	ratio, ok := ratio_setting.GetGroupGroupRatio(userGroup, group)
	if ok {
		return ratio
	}
	return ratio_setting.GetGroupRatio(group)
}

// TokenGroupEntry 令牌多分组配置项
type TokenGroupEntry struct {
	Group    string `json:"group"`
	Priority int    `json:"priority"`
}

// ResolveTokenGroups 解析令牌的有序分组列表。
// groups 为空时返回系统 autoGroups（按系统顺序），非空时解析 JSON 并按 priority 升序排序。
// 返回的列表已过滤掉用户无权访问的分组。
func ResolveTokenGroups(groups string, userGroup string) []string {
	usable := GetUserUsableGroups(userGroup)

	if groups == "" {
		// 为空：使用系统 autoGroups 顺序
		result := make([]string, 0)
		for _, g := range setting.GetAutoGroups() {
			if _, ok := usable[g]; ok {
				result = append(result, g)
			}
		}
		return result
	}

	var entries []TokenGroupEntry
	if err := common.UnmarshalJsonStr(groups, &entries); err != nil || len(entries) == 0 {
		return ResolveTokenGroups("", userGroup)
	}

	// 过滤无权分组
	valid := entries[:0]
	for _, e := range entries {
		if _, ok := usable[e.Group]; ok {
			valid = append(valid, e)
		}
	}
	if len(valid) == 0 {
		return ResolveTokenGroups("", userGroup)
	}

	sort.Slice(valid, func(i, j int) bool {
		return valid[i].Priority < valid[j].Priority
	})

	result := make([]string, len(valid))
	for i, e := range valid {
		result[i] = e.Group
	}
	return result
}
