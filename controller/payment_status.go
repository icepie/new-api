package controller

import (
	"fmt"
	"log"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"

	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
)

func collectEpayCallbackParams(c *gin.Context) (map[string]string, error) {
	if c.Request.Method == "POST" {
		if err := c.Request.ParseForm(); err != nil {
			return nil, err
		}
		return lo.Reduce(lo.Keys(c.Request.PostForm), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.PostForm.Get(t)
			return r
		}, map[string]string{}), nil
	}

	return lo.Reduce(lo.Keys(c.Request.URL.Query()), func(r map[string]string, t string, i int) map[string]string {
		r[t] = c.Request.URL.Query().Get(t)
		return r
	}, map[string]string{}), nil
}

func completeWalletTopUpFromVerifyInfo(verifyInfo *epay.VerifyRes) error {
	if verifyInfo == nil {
		return fmt.Errorf("empty verify info")
	}
	if verifyInfo.TradeStatus != epay.StatusTradeSuccess {
		return fmt.Errorf("unexpected trade status: %s", verifyInfo.TradeStatus)
	}

	LockOrder(verifyInfo.ServiceTradeNo)
	defer UnlockOrder(verifyInfo.ServiceTradeNo)

	topUp := model.GetTopUpByTradeNo(verifyInfo.ServiceTradeNo)
	if topUp == nil {
		return fmt.Errorf("topup not found: %s", verifyInfo.ServiceTradeNo)
	}
	if topUp.Status != common.TopUpStatusPending {
		return nil
	}

	topUp.Status = common.TopUpStatusSuccess
	topUp.CompleteTime = common.GetTimestamp()
	if err := topUp.Update(); err != nil {
		return err
	}

	dAmount := decimal.NewFromInt(topUp.Amount)
	dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
	quotaToAdd := int(dAmount.Mul(dQuotaPerUnit).IntPart())
	if err := model.IncreaseUserQuota(topUp.UserId, quotaToAdd, true); err != nil {
		return err
	}

	model.RecordLog(topUp.UserId, model.LogTypeTopup, fmt.Sprintf("使用在线充值成功，充值金额: %v，支付金额：%f", logger.LogQuota(quotaToAdd), topUp.Money))
	log.Printf("易支付订单完成成功 %v", topUp)
	return nil
}

func GetUserTopUpStatus(c *gin.Context) {
	tradeNo := c.Query("trade_no")
	if tradeNo == "" {
		common.ApiErrorMsg(c, "订单号不能为空")
		return
	}

	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil || topUp.UserId != c.GetInt("id") {
		common.ApiErrorMsg(c, "订单不存在")
		return
	}

	common.ApiSuccess(c, gin.H{
		"trade_no":       topUp.TradeNo,
		"status":         topUp.Status,
		"payment_method": topUp.PaymentMethod,
		"amount":         topUp.Amount,
		"money":          topUp.Money,
		"create_time":    topUp.CreateTime,
		"complete_time":  topUp.CompleteTime,
	})
}

func GetSubscriptionOrderStatus(c *gin.Context) {
	tradeNo := c.Query("trade_no")
	if tradeNo == "" {
		common.ApiErrorMsg(c, "订单号不能为空")
		return
	}

	order := model.GetSubscriptionOrderByTradeNo(tradeNo)
	if order == nil || order.UserId != c.GetInt("id") {
		common.ApiErrorMsg(c, "订单不存在")
		return
	}

	common.ApiSuccess(c, gin.H{
		"trade_no":       order.TradeNo,
		"status":         order.Status,
		"payment_method": order.PaymentMethod,
		"plan_id":        order.PlanId,
		"money":          order.Money,
		"create_time":    order.CreateTime,
		"complete_time":  order.CompleteTime,
	})
}
