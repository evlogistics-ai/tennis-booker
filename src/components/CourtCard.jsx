const SURFACE_COLORS = {
  Hard: "#4a90d9",
  Clay: "#d4845a",
  Grass: "#5aad5a",
};

export default function CourtCard({ court, onSelect }) {
  return (
    <div className="court-card" onClick={() => onSelect(court)}>
      <div
        className="court-card-surface"
        style={{ backgroundColor: SURFACE_COLORS[court.surface] || "#888" }}
      >
        {court.surface}
      </div>
      <div className="court-card-body">
        <h3>{court.name}</h3>
        <p className="court-location">{court.location}</p>
      </div>
      <div className="court-card-action">Book &rarr;</div>
    </div>
  );
}
