import { useState, useEffect, useRef } from 'react';

/**
 * 文字打乱效果组件
 * 当元素进入视口时，逐字显示文本，每个字符在显示前会随机打乱
 */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

const getRandomChar = () => {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
};

export default function ShuffleText({
  text,
  speed = 35,
  shuffleDuration = 90,
  className = '',
}) {
  const [displayedText, setDisplayedText] = useState('');
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const shuffleTimeoutRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 重置状态
            setDisplayedText('');

            // 清除之前的定时器
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
            }
            if (shuffleTimeoutRef.current) {
              clearTimeout(shuffleTimeoutRef.current);
            }

            // 开始 shuffle 动画
            let index = 0;
            const animate = () => {
              if (index < text.length) {
                let shuffleCount = 0;
                const maxShuffles = Math.floor(shuffleDuration / 12);

                // 打乱当前字符
                const shuffleChar = () => {
                  if (shuffleCount < maxShuffles) {
                    const randomChar = getRandomChar();
                    setDisplayedText(text.slice(0, index) + randomChar);
                    shuffleCount++;
                    shuffleTimeoutRef.current = setTimeout(shuffleChar, 12);
                  } else {
                    // 打乱结束，显示正确字符
                    setDisplayedText(text.slice(0, index + 1));
                    index++;
                    // 继续下一个字符
                    animationRef.current = requestAnimationFrame(() => {
                      setTimeout(() => {
                        animationRef.current = requestAnimationFrame(animate);
                      }, speed);
                    });
                  }
                };

                shuffleChar();
              }
            };

            animationRef.current = requestAnimationFrame(animate);
          } else {
            // 离开视口时重置状态
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
              animationRef.current = null;
            }
            if (shuffleTimeoutRef.current) {
              clearTimeout(shuffleTimeoutRef.current);
              shuffleTimeoutRef.current = null;
            }
            setDisplayedText('');
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (shuffleTimeoutRef.current) {
        clearTimeout(shuffleTimeoutRef.current);
      }
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [text, speed, shuffleDuration]);

  return (
    <span ref={containerRef} className={`inline-block ${className}`}>
      {displayedText}
    </span>
  );
}

