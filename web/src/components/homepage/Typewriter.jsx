import { useState, useEffect, useRef } from 'react';

/**
 * 打字机效果组件
 * 当元素进入视口时，逐字显示文本
 */
export default function Typewriter({ text, speed = 100, className = '' }) {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const indexRef = useRef(0);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 重置状态
            indexRef.current = 0;
            setDisplayedText('');
            setShowCursor(true);

            // 清除之前的定时器
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }

            // 开始打字动画
            intervalRef.current = setInterval(() => {
              if (indexRef.current < text.length) {
                setDisplayedText(text.slice(0, indexRef.current + 1));
                indexRef.current += 1;
              } else {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                // 动画完成后，让光标闪烁几次然后隐藏
                setTimeout(() => {
                  setShowCursor(false);
                }, 1000);
              }
            }, speed);
          } else {
            // 离开视口时重置状态
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            indexRef.current = 0;
            setDisplayedText('');
            setShowCursor(true);
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [text, speed]);

  return (
    <span ref={containerRef} className={`inline-block ${className}`}>
      {displayedText}
      {showCursor && (
        <span className="typewriter-cursor" />
      )}
    </span>
  );
}

