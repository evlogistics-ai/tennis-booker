import CourtCard from "./CourtCard";

export default function CourtList({ courts, onSelectCourt }) {
  return (
    <div>
      <h2>Available Courts</h2>
      <div className="court-grid">
        {courts.map((court) => (
          <CourtCard key={court.id} court={court} onSelect={onSelectCourt} />
        ))}
      </div>
    </div>
  );
}
