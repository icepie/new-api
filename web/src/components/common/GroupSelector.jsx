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

import React, { useEffect, useRef, useState } from 'react';
import { Checkbox, Tag } from '@douyinfe/semi-ui';
import { IconChevronDown, IconHandle } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { renderRatio } from '../../helpers';

const GroupSelector = ({ groups, tokenGroups, setTokenGroups }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const dragMoved = useRef(false);

  const calcPanelStyle = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 10000,
    });
  };

  const handleOpen = () => {
    calcPanelStyle();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (groupName) => {
    setTokenGroups((prev) => {
      const idx = prev.findIndex((g) => g.group === groupName);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { group: groupName, priority: prev.length + 1 }];
    });
  };

  const handleDragStart = (e, idx) => {
    dragMoved.current = false;
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragMoved.current = true;
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    setTokenGroups((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const unselected = groups.filter((g) => !tokenGroups.some((tg) => tg.group === g.value));
  const triggerLabel =
    tokenGroups.length === 0
      ? t('为空时使用系统默认分组顺序')
      : tokenGroups.map((g, i) => `${i + 1}.${g.group}`).join('  ');

  const rowStyle = (isDragOver, isDragging, clickable) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    cursor: clickable ? 'pointer' : 'default',
    background: isDragOver ? 'var(--semi-color-primary-light-default)' : 'transparent',
    opacity: isDragging ? 0.35 : 1,
    borderBottom: '1px solid var(--semi-color-border)',
    transition: 'background 0.12s',
    userSelect: 'none',
  });

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={triggerRef}
        onClick={handleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          border: '1px solid var(--semi-color-border)',
          borderRadius: 6,
          cursor: 'pointer',
          background: 'var(--semi-color-bg-2)',
          minHeight: 32,
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: tokenGroups.length === 0 ? 'var(--semi-color-text-2)' : 'var(--semi-color-text-0)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {triggerLabel}
        </span>
        <IconChevronDown
          style={{
            flexShrink: 0,
            marginLeft: 6,
            color: 'var(--semi-color-text-2)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </div>

      {open && (
        <div
          ref={panelRef}
          style={{
            ...panelStyle,
            background: 'var(--semi-color-bg-2)',
            border: '1px solid var(--semi-color-border)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {groups.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--semi-color-text-2)', fontSize: 13 }}>
              {t('管理员未设置用户可选分组')}
            </div>
          ) : (
            <>
              {tokenGroups.map((item, idx) => {
                const meta = groups.find((g) => g.value === item.group);
                const isDragging = draggedIdx === idx;
                const isDragOver = dragOverIdx === idx && draggedIdx !== idx;
                return (
                  <div
                    key={item.group}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    style={rowStyle(isDragOver, isDragging, true)}
                    onClick={() => {
                      if (!dragMoved.current) toggle(item.group);
                    }}
                  >
                    <span
                      style={{ color: 'var(--semi-color-text-2)', flexShrink: 0, cursor: 'grab', display: 'flex', alignItems: 'center', width: 16 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconHandle size='small' />
                    </span>
                    <Checkbox
                      checked
                      onChange={() => {}}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!dragMoved.current) toggle(item.group);
                      }}
                      style={{ flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13 }}>{item.group}</div>
                      {meta?.label && meta.label !== item.group && (
                        <div style={{ fontSize: 11, color: 'var(--semi-color-text-2)' }}>{meta.label}</div>
                      )}
                    </div>
                    <Tag shape='circle' size='small' color='blue' style={{ flexShrink: 0 }}>
                      {idx + 1}
                    </Tag>
                    {meta?.ratio != null && (
                      <span style={{ flexShrink: 0 }}>{renderRatio(meta.ratio)}</span>
                    )}
                  </div>
                );
              })}

              {tokenGroups.length > 0 && unselected.length > 0 && (
                <div style={{ borderTop: '1px dashed var(--semi-color-border)', margin: '2px 0' }} />
              )}

              {unselected.map((g) => (
                <div
                  key={g.value}
                  style={rowStyle(false, false, true)}
                  onClick={() => toggle(g.value)}
                >
                  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', width: 16 }} />
                  <Checkbox
                    checked={false}
                    onChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                    style={{ flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{g.value}</div>
                    {g.label && g.label !== g.value && (
                      <div style={{ fontSize: 11, color: 'var(--semi-color-text-2)' }}>{g.label}</div>
                    )}
                  </div>
                  {g.ratio != null && (
                    <span style={{ flexShrink: 0 }}>{renderRatio(g.ratio)}</span>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
        {t('勾选分组并拖拽调整优先级顺序，为空时使用系统默认分组顺序')}
      </div>
    </div>
  );
};

export default GroupSelector;
