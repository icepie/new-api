import React from 'react';
import {
  SiAlipay,
  SiWechat,
  SiStripe,
  SiBitcoin,
  SiPaypal,
  SiGooglepay,
  SiApplepay,
} from 'react-icons/si';
import {
  FaGift,
  FaStar,
  FaTrophy,
  FaMedal,
  FaCrown,
  FaKey,
  FaFingerprint,
  FaIdCard,
  FaShieldAlt,
  FaPassport,
} from 'react-icons/fa';

const rechargeIcons = [
  <SiAlipay />,
  <SiWechat />,
  <SiStripe />,
  <SiBitcoin />,
  <SiPaypal />,
  <SiGooglepay />,
  <SiApplepay />,
];

const invitationIcons = [
  <FaGift />,
  <FaStar />,
  <FaTrophy />,
  <FaMedal />,
  <FaCrown />,
];

const userInfoIcons = [
  <FaKey />,
  <FaFingerprint />,
  <FaIdCard />,
  <FaShieldAlt />,
  <FaPassport />,
];

export const SMART_BACKGROUND_VARIANTS = {
  invitation: {
    underlayColor: '#0f766e',
    symbols: invitationIcons,
    symbolSize: 22,
    gap: 30,
    rotate: 15,
    random: { fontSizeRange: [18, 32] },
    animation: { type: 'right', speed: 3 },
    symbolsStyle: {
      color: 'rgba(255,255,255,0.30)',
      fontWeight: 700,
    },
    childrenWrapStyle: {
      padding: 0,
      overflow: 'hidden',
    },
  },
  recharge: {
    underlayColor: '#1d4ed8',
    symbols: rechargeIcons,
    symbolSize: 22,
    gap: 34,
    rotate: 12,
    random: { fontSizeRange: [16, 28] },
    animation: { type: 'right', speed: 4 },
    symbolsStyle: {
      color: 'rgba(255,255,255,0.30)',
      fontWeight: 700,
    },
    childrenWrapStyle: {
      padding: 0,
      overflow: 'hidden',
    },
  },
  userInfo: {
    underlayColor: '#0284c7',
    symbols: userInfoIcons,
    symbolSize: 22,
    gap: 28,
    rotate: -10,
    random: { fontSizeRange: [16, 28] },
    animation: { type: 'top', speed: 3 },
    symbolsStyle: {
      color: 'rgba(255,255,255,0.28)',
      fontWeight: 700,
    },
    childrenWrapStyle: {
      padding: 0,
      overflow: 'hidden',
    },
  },
  pricingAll: {
    underlayColor: '#0ea5e9',
    symbols: ['AI', 'LLM', 'API', '◈', '✦', '◆'],
    symbolSize: 17,
    gap: 28,
    rotate: -10,
    animation: { type: 'top', speed: 3 },
    symbolsStyle: {
      color: 'rgba(255,255,255,0.28)',
      fontWeight: 800,
      letterSpacing: '0.14em',
    },
    childrenWrapStyle: {
      padding: 0,
      overflow: 'hidden',
    },
  },
  pricingVendor: {
    underlayColor: '#059669',
    symbols: ['MODEL', 'TOKEN', '•', '⬢', '✧', '◌'],
    symbolSize: 16,
    gap: 24,
    exact: true,
    rotate: 0,
    animation: { type: 'left', speed: 2 },
    symbolsStyle: {
      color: 'rgba(255,255,255,0.30)',
      fontWeight: 700,
      letterSpacing: '0.16em',
    },
    childrenWrapStyle: {
      padding: 0,
      overflow: 'hidden',
    },
  },
};
