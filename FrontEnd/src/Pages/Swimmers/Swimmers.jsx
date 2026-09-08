import { useEffect, useState } from "react";
import SwimmerProfile from "./SwimmerProfile";

function Swimmers() {
  const [swimmers, setSwimmers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [selectedSwimmer, setSelectedSwimmer] = useState(null);
  const [editingSwimmer, setEditingSwimmer] = useState(null);

  const emptyForm = {
    name: "",
    dateOfBirth: "",
    level: "Beginner",
    heightFeet: "",
    heightInches: "",
    weight: "",
    extraDetails: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  const API_URL = "http://localhost:8080/api/swimmers";

  // Load swimmers from backend when page opens
  useEffect(() => {
    fetchSwimmers();
  }, []);

  const fetchSwimmers = async () => {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Failed to load swimmers.");
      }

      const data = await response.json();
      setSwimmers(data);
    } catch (err) {
      setError("Could not load swimmers from the server.");
      console.error(err);
    }
  };

  // Handle typing in the form
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setError("");
  };

  // Open Add Swimmer form
  const handleAdd = () => {
    setEditingSwimmer(null);
    setFormData(emptyForm);
    setError("");
    setShowForm(true);
  };

  // Open Edit Swimmer form
  const handleEdit = () => {
    setEditingSwimmer(selectedSwimmer);

    setFormData({
      name: selectedSwimmer.name,
      dateOfBirth: selectedSwimmer.dateOfBirth,
      level: selectedSwimmer.level,
      heightFeet: selectedSwimmer.heightFeet ?? "",
      heightInches: selectedSwimmer.heightInches ?? "",
      weight: selectedSwimmer.weight ?? "",
      extraDetails: selectedSwimmer.extraDetails ?? "",
    });

    setSelectedSwimmer(null);
    setError("");
    setShowForm(true);
  };

  // Delete swimmer
  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedSwimmer.name}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${selectedSwimmer.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete swimmer.");
      }

      setSwimmers((previousSwimmers) =>
        previousSwimmers.filter((swimmer) => swimmer.id !== selectedSwimmer.id),
      );

      setSelectedSwimmer(null);
    } catch (err) {
      setError("Could not delete swimmer.");
      console.error(err);
    }
  };

  // Save new swimmer OR edited swimmer
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Name validation
    if (!formData.name.trim()) {
      setError("Please enter the swimmer name.");
      return;
    }

    // DOB validation
    if (!formData.dateOfBirth) {
      setError("Please enter the swimmer date of birth.");
      return;
    }

    // Feet validation
    if (formData.heightFeet !== "" && Number(formData.heightFeet) < 0) {
      setError("Height cannot be negative.");
      return;
    }

    // Inches validation
    if (
      formData.heightInches !== "" &&
      (Number(formData.heightInches) < 0 || Number(formData.heightInches) > 11)
    ) {
      setError("Height inches must be between 0 and 11.");
      return;
    }

    // Weight validation
    if (formData.weight !== "" && Number(formData.weight) < 0) {
      setError("Weight cannot be negative.");
      return;
    }

    const swimmerData = {
      name: formData.name.trim(),
      dateOfBirth: formData.dateOfBirth,
      level: formData.level,
      heightFeet:
        formData.heightFeet === "" ? null : Number(formData.heightFeet),
      heightInches:
        formData.heightInches === "" ? null : Number(formData.heightInches),
      weight: formData.weight === "" ? null : Number(formData.weight),
      extraDetails: formData.extraDetails,
    };

    try {
      let response;

      // EDIT EXISTING SWIMMER
      if (editingSwimmer) {
        response = await fetch(`${API_URL}/${editingSwimmer.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(swimmerData),
        });
      }

      // ADD NEW SWIMMER
      else {
        response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(swimmerData),
        });
      }

      if (!response.ok) {
        throw new Error("Failed to save swimmer.");
      }

      const savedSwimmer = await response.json();

      if (editingSwimmer) {
        setSwimmers((previousSwimmers) =>
          previousSwimmers.map((swimmer) =>
            swimmer.id === editingSwimmer.id ? savedSwimmer : swimmer,
          ),
        );
      } else {
        setSwimmers((previousSwimmers) => [...previousSwimmers, savedSwimmer]);
      }

      setFormData(emptyForm);
      setEditingSwimmer(null);
      setError("");
      setShowForm(false);
    } catch (err) {
      setError("Could not save swimmer to the server.");
      console.error(err);
    }
  };

  // Cancel Add/Edit
  const handleCancel = () => {
    setFormData(emptyForm);
    setEditingSwimmer(null);
    setError("");
    setShowForm(false);
  };

  // SWIMMER PROFILE
  if (selectedSwimmer) {
    return (
      <SwimmerProfile
        swimmer={selectedSwimmer}
        onBack={() => setSelectedSwimmer(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <h1>Swimmers</h1>

        <button className="add-button" onClick={handleAdd}>
          + Add Swimmer
        </button>
      </div>

      {error && !showForm && <p className="form-error">{error}</p>}

      {/* ADD / EDIT FORM */}
      {showForm && (
        <form className="swimmer-form" onSubmit={handleSubmit}>
          <h2>{editingSwimmer ? "Edit Swimmer" : "Add Swimmer"}</h2>

          {error && <p className="form-error">{error}</p>}

          <label>Name *</label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />

          <label>Date of Birth *</label>

          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
          />

          <label>Swimming Level</label>

          <select name="level" value={formData.level} onChange={handleChange}>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <label>Height</label>

          <div className="height-inputs">
            <input
              type="number"
              name="heightFeet"
              placeholder="Feet"
              min="0"
              value={formData.heightFeet}
              onChange={handleChange}
            />

            <input
              type="number"
              name="heightInches"
              placeholder="Inches"
              min="0"
              max="11"
              value={formData.heightInches}
              onChange={handleChange}
            />
          </div>

          <label>Weight (kg)</label>

          <input
            type="number"
            name="weight"
            min="0"
            step="0.1"
            value={formData.weight}
            onChange={handleChange}
          />

          <label>Extra Details</label>

          <textarea
            name="extraDetails"
            value={formData.extraDetails}
            onChange={handleChange}
          />

          <div className="form-buttons">
            <button type="submit">
              {editingSwimmer ? "Save Changes" : "Save Swimmer"}
            </button>

            <button type="button" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* SWIMMER LIST */}
      <div className="swimmer-list">
        {swimmers.length === 0 ? (
          <p>No swimmers added yet.</p>
        ) : (
          swimmers.map((swimmer) => (
            <div
              className="swimmer-card"
              key={swimmer.id}
              onClick={() => setSelectedSwimmer(swimmer)}
            >
              <h3>{swimmer.name}</h3>

              <p>Level: {swimmer.level}</p>

              {(swimmer.heightFeet || swimmer.heightInches) && (
                <p>
                  Height: {swimmer.heightFeet || 0} ft{" "}
                  {swimmer.heightInches || 0} in
                </p>
              )}

              {swimmer.weight && <p>Weight: {swimmer.weight} kg</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Swimmers;
