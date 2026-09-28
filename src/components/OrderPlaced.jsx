import Overlay from './Overlay.jsx'

// Shown when Square sends the buyer back after paying (see ORDER_PLACED_PATH
// in server/checkout.js). App clears the cart at the same moment.
export default function OrderPlaced({ open, onClose }) {
  return (
    <Overlay open={open} onClose={onClose} variant="center" labelledBy="order-placed-title">
      <div className="order-placed">
        <img
          src="/images/Logos/Fab Fresh Color.png"
          alt=""
          width="72"
          height="72"
        />
        <h2 id="order-placed-title">Thank you. Your order is in.</h2>
        <p>
          Your receipt is on its way from Square. We'll cut your fudge fresh,
          tuck it in parchment, and get it packed for the trip.
        </p>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Back to the fudge
        </button>
      </div>
    </Overlay>
  )
}
