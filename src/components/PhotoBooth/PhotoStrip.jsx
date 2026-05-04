import './PhotoStrip.css'

export default function PhotoStrip({ frames }) {
  return (
    <div className="photo-strip">
      {/* Header */}
      <div className="photo-strip-header">
        <span className="photo-strip-star">✦</span>
        <h3>Jeannette's 25th</h3>
        <span className="photo-strip-sub">Anniversary Celebration</span>
      </div>

      {/* Connected photos — no gap, dark dividers between shots */}
      <div className="photo-strip-frames">
        {frames.map((frame, i) => (
          <div key={i} className="photo-strip-frame">
            {i > 0 && <div className="photo-strip-divider" />}
            <img src={frame} alt={`Photo ${i + 1}`} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="photo-strip-footer">
        <span>Salling Group · {new Date().toLocaleDateString('da-DK')}</span>
      </div>
    </div>
  )
}
