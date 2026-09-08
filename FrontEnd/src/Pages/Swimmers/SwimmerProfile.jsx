function SwimmerProfile({
  swimmer,
  onBack,
  onEdit,
  onDelete,
  deleting = false,
  deleteError = "",
}) {
  return (
    <div className="swimmer-profile">
      {/* Back Button */}
      <button type="button" onClick={onBack} disabled={deleting}>
        ← Back to Swimmers
      </button>

      {/* Swimmer Name */}
      <h1>{swimmer.name}</h1>

      {deleteError && <p className="form-error">{deleteError}</p>}

      {/* Swimmer Details */}
      <div className="profile-details">
        <p>
          <strong>Date of Birth:</strong> {swimmer.dateOfBirth}
        </p>

        <p>
          <strong>Swimming Level:</strong> {swimmer.level}
        </p>

        <p>
          <strong>Height:</strong> {swimmer.heightFeet || 0} ft{" "}
          {swimmer.heightInches || 0} in
        </p>

        <p>
          <strong>Weight:</strong>{" "}
          {swimmer.weight ? `${swimmer.weight} kg` : "Not provided"}
        </p>

        <p>
          <strong>Extra Details:</strong> {swimmer.extraDetails || "None"}
        </p>
      </div>

      {/* Profile Actions */}
      <div className="profile-buttons">
        <button type="button" onClick={onEdit} disabled={deleting}>
          Edit Swimmer
        </button>

        <button type="button" onClick={onDelete} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete Swimmer"}
        </button>
      </div>
    </div>
  );
}

export default SwimmerProfile;
