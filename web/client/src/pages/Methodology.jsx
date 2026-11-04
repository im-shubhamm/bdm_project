/**
 * Methodology — how Impact Points, Fair Value, Value Index and quadrants are defined,
 * the weights, the data sources and the limitations.
 */
import { PageHeader, CardHead } from '../components/ui';
import { QUADRANT } from '../lib/chart';

const WEIGHTS = [
  ['Goal', '12'], ['Assist', '8'], ['Minute played', '0.04'], ['Key pass', '1.5'],
  ['Shot', '0.8'], ['Tackle', '1.2'], ['Clean sheet (DEF/GK)', '10'], ['Yellow card', '−3'],
  ['Red card', '−8'],
];
const QUADS = [
  ['Star', 'fee ≥ median, impact ≥ median'],
  ['Steal', 'fee < median, impact ≥ median'],
  ['Overpaid', 'fee ≥ median, impact < median'],
  ['Passenger', 'fee < median, impact < median'],
];
const SOURCES = [
  ['Transfer fees 2013–2024', 'Premier League transfer fee dataset (season windows)'],
  ['Match event data', 'Match-level goals, assists, minutes, defensive actions'],
  ['Player identities', 'Club squad registers; hand-checked name fixes'],
  ['Roles & nationality', 'Official role tags; English / Overseas classification'],
  ['Unsold / free agents', 'Players available without a fee in the latest window'],
];

const formula = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '0.84rem', background: 'var(--card-alt)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', margin: '12px 0', lineHeight: 1.6 };
const p = { color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.65 };

export default function Methodology() {
  return (
    <div className="page" id="page-methodology">
      <PageHeader title="Methodology" finding="One score for attack, creativity and defence, judged against each season's own transfer market." />

      <div className="grid-3">
        <div className="card">
          <CardHead title="Impact Points" sub="On-pitch output on one scale" />
          <div style={formula}>12×Goals + 8×Assists + 0.04×Minutes + 1.5×KeyPasses + 0.8×Shots + 1.2×Tackles + 10×CleanSheets (DEF/GK) − cards</div>
          <table className="data-table">
            <thead><tr><th>Contribution</th><th className="num">Points</th></tr></thead>
            <tbody>{WEIGHTS.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num cell--strong">{v}</td></tr>)}</tbody>
          </table>
        </div>

        <div className="card">
          <CardHead title="Value Index" sub="Output share ÷ spend share, per season" />
          <div style={formula}>(Impact ÷ League priced impact) ÷ (Fee ÷ League transfer spend)</div>
          <p style={p}><strong style={{ color: 'var(--ink)' }}>1.00</strong> is fair value; above 1 means more output than the money suggests, below 1 less.</p>
          <p style={{ ...p, marginTop: 10 }}>For a group (club, role, bracket, several seasons) the shares are <strong style={{ color: 'var(--ink)' }}>summed season by season, then divided</strong>. Value Index values are never averaged.</p>
          <div style={formula}>VI(group) = Σ(Impact ÷ League impact) ÷ Σ(Fee ÷ League spend)</div>
        </div>

        <div className="card">
          <CardHead title="Fair value & overpay" sub="What the output would have cost" />
          <div style={formula}>Fair value = Impact × (League spend ÷ League priced impact)</div>
          <div style={formula}>Overpay = Fee − Fair value</div>
          <p style={p}>Positive overpay means overpaid. “Most overpaid” ranks by £ millions lost, because a ratio becomes extreme for cheap fringe signings.</p>
        </div>
      </div>

      <div className="grid-2 mt">
        <div className="card">
          <CardHead title="Value quadrants" sub="Compared with that season's median fee and median Impact Points" />
          <div className="grid-2" style={{ gap: 10 }}>
            {QUADS.map(([q, rule]) => (
              <div key={q} className="card card--alt" style={{ padding: '14px 16px' }}>
                <div style={{ fontWeight: 500 }}><span className="swatch" style={{ background: QUADRANT[q] }} />{q}</div>
                <div style={{ ...p, fontSize: '0.8rem', marginTop: 4 }}>{rule}</div>
              </div>
            ))}
          </div>
          <p style={{ ...p, marginTop: 12 }}>Fewer than 5 matches: <strong style={{ color: 'var(--ink)' }}>Too few matches</strong>. Homegrown / retained players with no transfer fee: <strong style={{ color: 'var(--ink)' }}>Unpriced</strong>, excluded from value measures.</p>
        </div>

        <div className="card">
          <CardHead title="Data sources" sub="Validated against official transfer totals and season leaders" />
          <table className="data-table">
            <tbody>{SOURCES.map(([k, v]) => <tr key={k}><td className="cell--strong">{k}</td><td style={{ color: 'var(--muted)' }}>{v}</td></tr>)}</tbody>
          </table>
          <CardHead title="Project team" />
          <table className="data-table">
            <tbody>
              <tr><td className="cell--strong">Shubham</td><td>2023IMG048</td></tr>
              <tr><td className="cell--strong">Arkadip Siddha</td><td>2023IMG009</td></tr>
              <tr><td className="cell--strong">Advitya Ranjan</td><td>2023IMG004</td></tr>
              <tr><td className="cell--strong">Chayan Das</td><td>2023IMG017</td></tr>
            </tbody>
          </table>
          <CardHead title="Limitations" />
          <ul style={{ ...p, paddingLeft: 18 }}>
            <li>Players without a recorded transfer fee are excluded from value measures.</li>
            <li>Fees attach to the arrival season only; later seasons are unpriced.</li>
            <li>Homegrown status is proxied by English nationality.</li>
            <li>Some fees are rounded demo figures suitable for coursework.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
