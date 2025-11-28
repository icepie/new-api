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

import React, { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '../../hooks/common/useIsMobile';

const ScrollIndicator = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sectionCount, setSectionCount] = useState(5);
  const [animatedPosition, setAnimatedPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStartPos, setAnimationStartPos] = useState(0);
  const [animationTargetPos, setAnimationTargetPos] = useState(0);
  const indicatorRef = useRef(null);
  const observerRef = useRef(null);
  const animationRef = useRef(null);
  const previousPositionRef = useRef(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const findContainer = () => {
      return document.querySelector('.snap-scroll-container');
    };

    const initObserver = () => {
      const container = findContainer();
      if (!container) {
        setTimeout(initObserver, 100);
        return;
      }

      // 查找所有 section（排除最后一个 footer）
      const sections = container.querySelectorAll('.snap-section');
      if (sections.length === 0) {
        setTimeout(initObserver, 100);
        return;
      }

      // 更新 section 数量（排除最后一个 footer）
      const displayCount = Math.max(1, sections.length - 1);
      setSectionCount(displayCount);

      // 创建 IntersectionObserver 来检测当前可见的 section
      observerRef.current = new IntersectionObserver(
        (entries) => {
          // 找到最接近视口中心的 section
          let maxIntersectionRatio = 0;
          let activeSectionIndex = 0;

          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > maxIntersectionRatio) {
              maxIntersectionRatio = entry.intersectionRatio;
              activeSectionIndex = Array.from(sections).indexOf(entry.target);
            }
          });

          // 如果没有找到，通过滚动位置计算
          if (maxIntersectionRatio === 0) {
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const centerY = scrollTop + containerHeight / 2;

            sections.forEach((section, index) => {
              const rect = section.getBoundingClientRect();
              const sectionTop = rect.top + scrollTop;
              const sectionHeight = rect.height;
              const sectionCenter = sectionTop + sectionHeight / 2;

              if (Math.abs(centerY - sectionCenter) < containerHeight / 2) {
                activeSectionIndex = index;
              }
            });
          }

          // 如果激活的是最后一个 section（footer），不显示高亮
          // 或者显示倒数第二个 section 的高亮
          if (activeSectionIndex >= displayCount) {
            activeSectionIndex = displayCount - 1;
          }

          setActiveIndex(activeSectionIndex);
        },
        {
          root: container,
          threshold: [0, 0.25, 0.5, 0.75, 1],
          rootMargin: '-40% 0px -40% 0px', // 只检测视口中心区域
        }
      );

      // 观察所有 section
      sections.forEach((section) => {
        observerRef.current.observe(section);
      });

      // 初始计算
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const centerY = scrollTop + containerHeight / 2;

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const sectionTop = rect.top + scrollTop;
        const sectionHeight = rect.height;
        const sectionCenter = sectionTop + sectionHeight / 2;

        if (Math.abs(centerY - sectionCenter) < containerHeight) {
          // 如果激活的是最后一个 section（footer），显示倒数第二个
          const activeIndex = index >= displayCount ? displayCount - 1 : index;
          setActiveIndex(activeIndex);
        }
      });
    };

    initObserver();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // 计算每个点的位置
  const getDotPosition = (index, total) => {
    if (total <= 1) return 0;
    // 轨道高度 240px，点直径 8px
    // 第一个点在顶部，最后一个点在底部
    // 可用空间 = 240 - 8 = 232px
    const availableSpace = 232;
    return (index / (total - 1)) * availableSpace;
  };

  // 非线性缓动函数 (ease-in-out-quart)
  const easeInOutQuart = (t) => {
    return t < 0.5
      ? 8 * t * t * t * t
      : 1 - Math.pow(-2 * t + 2, 4) / 2;
  };

  // 当 activeIndex 改变时，动画移动发光指示器
  useEffect(() => {
    if (sectionCount <= 1) return;

    const targetPosition = getDotPosition(activeIndex, sectionCount);
    const startPosition = previousPositionRef.current;
    const distance = targetPosition - startPosition;
    const duration = 600; // 动画时长 600ms
    const startTime = performance.now();

    // 取消之前的动画
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // 如果距离很小，直接设置位置，不动画
    if (Math.abs(distance) < 0.1) {
      setAnimatedPosition(targetPosition);
      previousPositionRef.current = targetPosition;
      setIsAnimating(false);
      setAnimationStartPos(targetPosition);
      setAnimationTargetPos(targetPosition);
      return;
    }

    // 开始动画
    setIsAnimating(true);
    setAnimationStartPos(startPosition);
    setAnimationTargetPos(targetPosition);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用非线性缓动函数
      const easedProgress = easeInOutQuart(progress);
      
      // 计算当前位置
      const currentPosition = startPosition + distance * easedProgress;
      setAnimatedPosition(currentPosition);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // 动画完成，确保精确到达目标位置
        setAnimatedPosition(targetPosition);
        previousPositionRef.current = targetPosition;
        setIsAnimating(false);
        setAnimationStartPos(targetPosition);
        setAnimationTargetPos(targetPosition);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activeIndex, sectionCount]);

  // 初始化位置
  useEffect(() => {
    if (sectionCount > 1) {
      const initialPosition = getDotPosition(activeIndex, sectionCount);
      setAnimatedPosition(initialPosition);
      previousPositionRef.current = initialPosition;
      setIsAnimating(false);
    }
  }, [sectionCount]);

  const dots = Array.from({ length: sectionCount }, (_, i) => i);

  // 在移动端或宽度不够时不显示指示器
  if (isMobile) {
    return null;
  }

  // 计算发光指示器与目标点的距离
  const targetPosition = getDotPosition(activeIndex, sectionCount);
  const distanceToTarget = Math.abs(animatedPosition - targetPosition);
  const isAtTarget = distanceToTarget < 1; // 到达目标点（1px 误差内）
  
  // 发光线条只在动画过程中显示，到达目标后隐藏
  const showGlow = isAnimating && !isAtTarget;
  
  // 计算线条长度：离开起始位置时变长，接近目标时变短
  const getGlowHeight = () => {
    if (!isAnimating) return 24; // 默认长度
    
    const totalDistance = Math.abs(animationTargetPos - animationStartPos);
    if (totalDistance < 1) return 24;
    
    const distanceFromStart = Math.abs(animatedPosition - animationStartPos);
    const distanceFromTarget = Math.abs(animatedPosition - animationTargetPos);
    
    // 最小长度和最大长度
    const minHeight = 8;
    const maxHeight = 32;
    
    // 计算在起始位置和目标位置附近的淡入淡出区域（各占 20%）
    const fadeZone = totalDistance * 0.2;
    
    let height = maxHeight;
    
    // 在起始位置附近：逐渐变长
    if (distanceFromStart < fadeZone) {
      const startProgress = distanceFromStart / fadeZone;
      height = minHeight + (maxHeight - minHeight) * startProgress;
    }
    // 在目标位置附近：逐渐变短
    else if (distanceFromTarget < fadeZone) {
      const targetProgress = distanceFromTarget / fadeZone;
      height = minHeight + (maxHeight - minHeight) * targetProgress;
    }
    // 中间区域：保持最大长度
    else {
      height = maxHeight;
    }
    
    return height;
  };
  
  const glowHeight = getGlowHeight();

  return (
    <div className="scroll-indicator" ref={indicatorRef}>
      <div className="scroll-indicator-track">
        {/* 移动的发光指示器 - 只在动画过程中显示 */}
        {showGlow && (
          <div
            className="scroll-indicator-glow"
            style={{
              top: `${animatedPosition + 4}px`, // 点的中心位置（点高度8px，中心在4px处）
              height: `${glowHeight}px`,
              transform: 'translateX(-50%) translateY(-50%)',
            }}
          />
        )}
        
        {/* 静态的点 - 只在动画完成后显示激活的点 */}
        {dots.map((index) => {
          const dotPosition = getDotPosition(index, sectionCount);
          const isActive = index === activeIndex;
          // 激活的点只在动画完成后显示
          const shouldShow = isActive && !isAnimating;
          
          return (
            <div
              key={index}
              className={`scroll-indicator-dot-wrapper ${
                isActive ? 'active' : ''
              }`}
              style={{
                top: `${dotPosition}px`,
                opacity: shouldShow ? 1 : isActive ? 0 : 0.4,
                transition: 'opacity 0.2s ease',
              }}
            >
              <div className="scroll-indicator-dot" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScrollIndicator;

