import mascot from '../../assets/mascot-chrono-pricing.png'

export function PricingFaqMascot() {
  return <div className="pricing-faq-mascot" aria-hidden="true">
    <span className="pricing-faq-halo" />
    <span className="pricing-faq-orbit" />
    <span className="pricing-faq-bubble">Cùng chọn gói phù hợp nhé!</span>
    <img src={mascot} alt="" loading="lazy" width={1254} height={1254} />
    <span className="pricing-faq-token pricing-faq-token--question">?</span>
    <span className="pricing-faq-token pricing-faq-token--check">✓</span>
    <span className="pricing-faq-spark pricing-faq-spark--one">✦</span>
    <span className="pricing-faq-spark pricing-faq-spark--two">✧</span>
    <span className="pricing-faq-shadow" />
  </div>
}
