export default function PremiumBadge({ style }: { style?: React.CSSProperties }) {
  return (
    <span aria-label="프리미엄 회원" style={{ color: '#B8860B', ...style }}>★</span>
  )
}
