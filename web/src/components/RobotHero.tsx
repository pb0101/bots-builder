/** A friendly robot drawn in CSS blocks, annotated like an engineering print. */
export function RobotHero() {
  return (
    <div className="robot-stage" aria-hidden="true">
      <div className="dim dim-top"><span>240&nbsp;mm</span></div>
      <div className="robot">
        <div className="robot-antenna" />
        <div className="robot-head">
          <div className="robot-eye" />
          <div className="robot-eye" />
        </div>
        <div className="robot-body">
          <div className="robot-port" />
          <div className="robot-port lit" />
          <div className="robot-port" />
        </div>
        <div className="robot-tracks">
          <div className="robot-wheel" />
          <div className="robot-wheel" />
        </div>
      </div>
      <div className="dim dim-side"><span>turn&nbsp;to&nbsp;heading&nbsp;90°</span></div>
    </div>
  );
}
