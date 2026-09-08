import { useEffect, useRef, useState } from "react";
import SwimmerProfile from "./SwimmerProfile";

const VIEW = {
  LIST: "list",
  PROFILE: "profile",
  FORM: "form",
};

const API_URL = "http://localhost:8080/api/swimmers";

const emptyForm = {
  name: "",
  dateOfBirth: "",
  level: "Beginner",
  heightFeet: "",
  heightInches: "",
  weight: "",
  extraDetails: "",
};

async function getErrorMessage(response, fallback) {
  try {
    const data = await response.clone().json();

    if (data?.message) {
      return data.message;
    }
  } catch {
    // Ignore non-JSON responses.
  }

  return fallback;
}

function Swimmers() {
  const [view, setView] = useState(VIEW.LIST);
  const [formMode, setFormMode] = useState(null);

  const [swimmers, setSwimmers] = useState([]);
  const [selectedSwimmer, setSelectedSwimmer] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const [initialLoading, setInitialLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      if (isMounted.current) {
        setSuccessMessage("");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    fetchSwimmers();
  }, []);

  const fetchSwimmers = async () => {
    setInitialLoading(true);
    setListError("");

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to load swimmers."),
        );
      }

      const data = await response.json();

      if (!isMounted.current) return;

      setSwimmers(data);
    } catch (err) {
      console.error(err);

      if (!isMounted.current) return;

      setListError(err.message || "Could not load swimmers from the server.");
    } finally {
      if (isMounted.current) {
        setInitialLoading(false);
      }
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setFormError("");
  };

  const handleAdd = () => {
    setFormMode("add");
    setFormData(emptyForm);
    setFormError("");
    setSuccessMessage("");
    setView(VIEW.FORM);
  };

  const handleEdit = () => {
    if (!selectedSwimmer) return;

    setFormMode("edit");

    setFormData({
      name: selectedSwimmer.name,
      dateOfBirth: selectedSwimmer.dateOfBirth,
      level: selectedSwimmer.level,
      heightFeet: selectedSwimmer.heightFeet ?? "",
      heightInches: selectedSwimmer.heightInches ?? "",
      weight: selectedSwimmer.weight ?? "",
      extraDetails: selectedSwimmer.extraDetails ?? "",
    });

    setFormError("");
    setSuccessMessage("");
    setView(VIEW.FORM);
  };

  const handleCancelForm = () => {
    setFormData(emptyForm);
    setFormError("");

    if (formMode === "edit" && selectedSwimmer) {
      setView(VIEW.PROFILE);
    } else {
      setView(VIEW.LIST);
    }

    setFormMode(null);
  };

  const handleSelectSwimmer = (swimmer) => {
    setSelectedSwimmer(swimmer);
    setDeleteError("");
    setSuccessMessage("");
    setView(VIEW.PROFILE);
  };

  const handleBackToList = () => {
    setSelectedSwimmer(null);
    setDeleteError("");
    setView(VIEW.LIST);
  };

  const handleDelete = async () => {
    if (!selectedSwimmer || deleting) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedSwimmer.name}?`,
    );

    if (!confirmed) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch(`${API_URL}/${selectedSwimmer.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to delete swimmer."),
        );
      }

      const deletedId = selectedSwimmer.id;
      const deletedName = selectedSwimmer.name;

      if (!isMounted.current) return;

      setSwimmers((previousSwimmers) =>
        previousSwimmers.filter((swimmer) => swimmer.id !== deletedId),
      );

      setSelectedSwimmer(null);
      setView(VIEW.LIST);
      setSuccessMessage(`${deletedName} was deleted.`);
    } catch (err) {
      console.error(err);

      if (!isMounted.current) return;

      setDeleteError(err.message || "Could not delete swimmer.");
    } finally {
      if (isMounted.current) {
        setDeleting(false);
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    if (!formData.name.trim()) {
      setFormError("Please enter the swimmer name.");
      return;
    }

    if (!formData.dateOfBirth) {
      setFormError("Please enter the swimmer date of birth.");
      return;
    }

    if (formData.heightFeet !== "" && Number(formData.heightFeet) < 0) {
      setFormError("Height cannot be negative.");
      return;
    }

    if (
      formData.heightInches !== "" &&
      (Number(formData.heightInches) < 0 || Number(formData.heightInches) > 11)
    ) {
      setFormError("Height inches must be between 0 and 11.");
      return;
    }

    if (formData.weight !== "" && Number(formData.weight) < 0) {
      setFormError("Weight cannot be negative.");
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
      extraDetails: formData.extraDetails.trim(),
    };

    setSubmitting(true);
    setFormError("");

    try {
      const isEditing = formMode === "edit" && selectedSwimmer;

      const response = isEditing
        ? await fetch(`${API_URL}/${selectedSwimmer.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(swimmerData),
          })
        : await fetch(API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(swimmerData),
          });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to save swimmer."),
        );
      }

      const savedSwimmer = await response.json();

      if (!isMounted.current) return;

      if (isEditing) {
        setSwimmers((previousSwimmers) =>
          previousSwimmers.map((swimmer) =>
            swimmer.id === savedSwimmer.id ? savedSwimmer : swimmer,
          ),
        );

        setSelectedSwimmer(savedSwimmer);
        setView(VIEW.PROFILE);
        setSuccessMessage(`${savedSwimmer.name} was updated.`);
      } else {
        setSwimmers((previousSwimmers) => [...previousSwimmers, savedSwimmer]);

        setSelectedSwimmer(null);
        setView(VIEW.LIST);
        setSuccessMessage(`${savedSwimmer.name} was added.`);
      }

      setFormData(emptyForm);
      setFormMode(null);
      setFormError("");
    } catch (err) {
      console.error(err);

      if (!isMounted.current) return;

      setFormError(err.message || "Could not save swimmer to the server.");
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  if (view === VIEW.PROFILE && selectedSwimmer) {
    return (
      <SwimmerProfile
        swimmer={selectedSwimmer}
        onBack={handleBackToList}
        onEdit={handleEdit}
        onDelete={handleDelete}
        deleting={deleting}
        deleteError={deleteError}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Swimmers</h1>

        {view === VIEW.LIST && (
          <button type="button" className="add-button" onClick={handleAdd}>
            + Add Swimmer
          </button>
        )}
      </div>

      {successMessage && view === VIEW.LIST && (
        <p className="form-success">{successMessage}</p>
      )}

      {view === VIEW.FORM && (
        <form className="swimmer-form" onSubmit={handleSubmit}>
          <h2>{formMode === "edit" ? "Edit Swimmer" : "Add Swimmer"}</h2>

          {formError && <p className="form-error">{formError}</p>}

          <label htmlFor="name">Name *</label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={submitting}
            autoFocus
          />

          <label htmlFor="dateOfBirth">Date of Birth *</label>
          <input
            id="dateOfBirth"
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            disabled={submitting}
          />

          <label htmlFor="level">Swimming Level</label>
          <select
            id="level"
            name="level"
            value={formData.level}
            onChange={handleChange}
            disabled={submitting}
          >
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
              disabled={submitting}
            />

            <input
              type="number"
              name="heightInches"
              placeholder="Inches"
              min="0"
              max="11"
              value={formData.heightInches}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          <label htmlFor="weight">Weight (kg)</label>
          <input
            id="weight"
            type="number"
            name="weight"
            min="0"
            step="0.1"
            value={formData.weight}
            onChange={handleChange}
            disabled={submitting}
          />

          <label htmlFor="extraDetails">Extra Details</label>
          <textarea
            id="extraDetails"
            name="extraDetails"
            value={formData.extraDetails}
            onChange={handleChange}
            disabled={submitting}
          />

          <div className="form-buttons">
            <button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : formMode === "edit"
                  ? "Save Changes"
                  : "Save Swimmer"}
            </button>

            <button
              type="button"
              onClick={handleCancelForm}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {view === VIEW.LIST && (
        <div className="swimmer-list">
          {initialLoading ? (
            <p>Loading swimmers...</p>
          ) : listError ? (
            <div className="form-error">
              <p>{listError}</p>

              <button type="button" onClick={fetchSwimmers}>
                Try Again
              </button>
            </div>
          ) : swimmers.length === 0 ? (
            <p>No swimmers added yet.</p>
          ) : (
            swimmers.map((swimmer) => (
              <div
                className="swimmer-card"
                key={swimmer.id}
                onClick={() => handleSelectSwimmer(swimmer)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelectSwimmer(swimmer);
                  }
                }}
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
      )}
    </div>
  );
}

export default Swimmers;
