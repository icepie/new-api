/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React from 'react';
import { Check, X } from 'lucide-react';

const MODALITY_LABELS = {
  text: { zh: '文本', en: 'Text' },
  image: { zh: '图像', en: 'Image' },
  audio: { zh: '音频', en: 'Audio' },
  video: { zh: '视频', en: 'Video' },
  pdf: { zh: 'PDF', en: 'PDF' },
};

function parseMetadata(officialMetadata) {
  if (!officialMetadata || typeof officialMetadata !== 'string') return null;
  try {
    return JSON.parse(officialMetadata);
  } catch {
    return null;
  }
}

/**
 * 官方元数据展示块（卡片底部与详情内共用，协调样式）
 * @param {string} officialMetadata - JSON 字符串（modalities/attachment/reasoning/limit/knowledge 等）
 * @param {'card'|'detail'} variant - card：紧凑标签行；detail：完整表格式
 * @param {string} locale - 'zh' | 'en'
 */
export default function OfficialMetadataBlock({ officialMetadata, variant = 'card', locale = 'zh' }) {
  const meta = parseMetadata(officialMetadata);
  if (!meta) return null;

  const label = (m) => (MODALITY_LABELS[m] ? MODALITY_LABELS[m][locale === 'zh' ? 'zh' : 'en'] : m);

  const hasModalities = meta.modalities && (
    (Array.isArray(meta.modalities.input) && meta.modalities.input.length > 0) ||
    (Array.isArray(meta.modalities.output) && meta.modalities.output.length > 0)
  );
  const flags = [
    { key: 'attachment', label: locale === 'zh' ? '附件' : 'Attachment', v: meta.attachment },
    { key: 'reasoning', label: locale === 'zh' ? '推理' : 'Reasoning', v: meta.reasoning },
    { key: 'tool_call', label: locale === 'zh' ? '工具调用' : 'Tool calling', v: meta.tool_call },
    { key: 'temperature', label: locale === 'zh' ? '温度' : 'Temperature', v: meta.temperature },
  ].filter((f) => typeof f.v === 'boolean');
  const hasLimit = meta.limit && (meta.limit.context != null || meta.limit.output != null);
  const hasKnowledge = typeof meta.knowledge === 'string' && meta.knowledge !== '';

  if (!hasModalities && flags.length === 0 && !hasLimit && !hasKnowledge) return null;

  if (variant === 'card') {
    const tags = [];
    // 仅显示「支持」的特性，不显示「不支持」的
    flags.forEach((f) => { if (f.v) tags.push(f.label); });
    if (hasModalities) {
      const all = [...(meta.modalities?.input ?? []), ...(meta.modalities?.output ?? [])];
      const uniq = [...new Set(all)];
      if (uniq.length) tags.push(uniq.map((m) => label(m)).join('/'));
    }
    if (hasKnowledge) tags.push(`${locale === 'zh' ? '知识' : 'Knowledge'}: ${meta.knowledge}`);
    // 底部不显示上下文/输出上限
    if (tags.length === 0) return null;
    return (
      <div className="pricing-official-meta pricing-official-meta--card">
        <div className="pricing-official-meta-tags">
          {tags.map((tag) => (
            <span key={tag} className="pricing-official-meta-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // variant === 'detail'
  const isZh = locale === 'zh';
  const modalitiesRowLabel = isZh ? '输入 / 输出' : 'INPUT / OUTPUT';
  const inputLabel = isZh ? '输入：' : 'INPUT:';
  const outputLabel = isZh ? '输出：' : 'OUTPUT:';

  const rows = [];
  if (hasModalities) {
    const input = meta.modalities.input ?? [];
    const output = meta.modalities.output ?? [];
    rows.push({
      key: 'modalities',
      label: modalitiesRowLabel,
      value: (
        <div className="pricing-official-meta-modalities">
          <span className="pricing-official-meta-modality-row">
            <span className="pricing-official-meta-modality-label">{inputLabel}</span>
            {input.length ? input.map((m) => (
              <span key={m} className="pricing-official-meta-tag">{label(m)}</span>
            )) : <span className="pricing-official-meta-muted">—</span>}
          </span>
          <span className="pricing-official-meta-modality-row">
            <span className="pricing-official-meta-modality-label">{outputLabel}</span>
            {output.length ? output.map((m) => (
              <span key={m} className="pricing-official-meta-tag">{label(m)}</span>
            )) : <span className="pricing-official-meta-muted">—</span>}
          </span>
        </div>
      ),
    });
  }
  flags.forEach((f) => {
    rows.push({
      key: f.key,
      label: f.label,
      value: f.v ? (
        <span className="pricing-official-meta-supported">
          <Check size={14} /> {locale === 'zh' ? '支持' : 'Yes'}
        </span>
      ) : (
        <span className="pricing-official-meta-unsupported">
          <X size={14} /> {locale === 'zh' ? '不支持' : 'No'}
        </span>
      ),
    });
  });
  if (hasLimit) {
    const contextLabel = isZh ? '上下文' : 'context';
    const outputLimitLabel = isZh ? '输出上限' : 'output';
    const numLocale = isZh ? 'zh-CN' : 'en-US';
    rows.push({
      key: 'limit',
      label: isZh ? '限制' : 'Limit',
      value: (
        <span className="pricing-official-meta-limit">
          {meta.limit.context != null && <span>{contextLabel}：{meta.limit.context.toLocaleString(numLocale)}</span>}
          {meta.limit.context != null && meta.limit.output != null && ' · '}
          {meta.limit.output != null && <span>{outputLimitLabel}：{meta.limit.output.toLocaleString(numLocale)}</span>}
        </span>
      ),
    });
  }
  if (hasKnowledge) {
    rows.push({ key: 'knowledge', label: locale === 'zh' ? '知识版本' : 'Knowledge', value: <span className="pricing-official-meta-tag">{meta.knowledge}</span> });
  }

  if (rows.length === 0) return null;

  return (
    <div className="pricing-official-meta pricing-official-meta--detail">
      <div className="pricing-official-meta-table">
        {rows.map((row) => (
          <div key={row.key} className="pricing-official-meta-row">
            <span className="pricing-official-meta-row-label">{row.label}</span>
            <span className="pricing-official-meta-row-value">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
