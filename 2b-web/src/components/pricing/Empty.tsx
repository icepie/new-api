// 自定义Empty组件

interface EmptyProps {
  title?: string;
  description?: string;
  style?: React.CSSProperties;
}

const Empty = ({ title = '暂无数据', description, style }: EmptyProps) => {
  return (
    <div className="custom-empty" style={style}>
      <div className="custom-empty-icon">
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="8" y="8" width="48" height="48" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.3" />
          <path d="M20 28L32 40L44 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        </svg>
      </div>
      <div className="custom-empty-title">{title}</div>
      {description && <div className="custom-empty-description">{description}</div>}
    </div>
  );
};

export default Empty;
