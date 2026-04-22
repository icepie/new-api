package helper

import (
	"net/http/httptest"
	"testing"

	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
)

func TestHandleGroupRatioWritesBackActualGroupRatio(t *testing.T) {
	oldGroupRatio := ratio_setting.GroupRatio2JSONString()
	oldGroupGroupRatio := ratio_setting.GroupGroupRatio2JSONString()
	t.Cleanup(func() {
		_ = ratio_setting.UpdateGroupRatioByJSONString(oldGroupRatio)
		_ = ratio_setting.UpdateGroupGroupRatioByJSONString(oldGroupGroupRatio)
	})

	if err := ratio_setting.UpdateGroupRatioByJSONString(`{"default":1,"premium":1.3}`); err != nil {
		t.Fatalf("failed to update group ratio: %v", err)
	}
	if err := ratio_setting.UpdateGroupGroupRatioByJSONString(`{"vip":{"premium":0.6}}`); err != nil {
		t.Fatalf("failed to update user-group ratio: %v", err)
	}

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Set("auto_group", "premium")

	info := &relaycommon.RelayInfo{
		UserGroup:  "vip",
		UsingGroup: "default",
	}

	groupRatioInfo := HandleGroupRatio(ctx, info)

	if info.UsingGroup != "premium" {
		t.Fatalf("expected using group to switch to premium, got %q", info.UsingGroup)
	}
	if !groupRatioInfo.HasSpecialRatio {
		t.Fatalf("expected special ratio to be applied")
	}
	if groupRatioInfo.GroupRatio != 0.6 {
		t.Fatalf("expected group ratio 0.6, got %v", groupRatioInfo.GroupRatio)
	}
	if groupRatioInfo.GroupSpecialRatio != 0.6 {
		t.Fatalf("expected special group ratio 0.6, got %v", groupRatioInfo.GroupSpecialRatio)
	}
	if info.PriceData.GroupRatioInfo.GroupRatio != 0.6 {
		t.Fatalf("expected price data to be written back with ratio 0.6, got %v", info.PriceData.GroupRatioInfo.GroupRatio)
	}
}
