import { adminSupabase } from "backend/lib/supabaseSuperAdmin";

const Delete = () => {
  const handleDelete = async () => {
    const { data, error } = await adminSupabase.auth.admin.deleteUser(
      "0de2bed0-f0cf-4769-b9b5-f274f1e6d3af"
    );
    if (error) console.error("Error deleting user:", error);
    else console.log("User deleted successfully:", data);
  };

  const handleAddStaff = async () => {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: "zeusdelosreyes9@gmail.com",
      password: "#staffPassword2",
      email_confirm: true,
      phone_confirm_at: new Date().toISOString(),
      phone: "+639937683114",
      user_metadata: {
        user_type: "staff",
        first_name: "Manoy",
        last_name: "Diaz",
        address:
          "Alexandria Bldg. Abella Rd, Sto. Cristo, Palmera, San Jose Del Monte Bulacan",
        clinic_id: "daa2fd13-2b6b-44e5-bf27-d34ff3808c64",
        employee_id: "GSC-101",
        position: "Staff",
        hire_date: "2023-01-01",
        department: "Dental",
        phone_verified: true,
      },
    });
    if (error) console.error("Error adding staff:", error);
    else console.log("Staff added successfully:", data);
  };

  const handleAddAdmin = async () => {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: "razhermosa@gmail.com",
      password: "#adminPassword1",
      email_confirm: true,
      phone: "+639558941693",
      phone_confirm_at: new Date().toISOString(),
      user_metadata: {
        user_type: "admin",
        first_name: "Raz",
        last_name: "Hermosa",
        phone_verified: true,
      },
    });
    if (error) console.error("Error adding admin:", error);
    else console.log("Admin added successfully:", data);
  };

  return (
    <div>
      <button onClick={handleDelete} className="cursor-pointer">
        Delete User
      </button>
      <button onClick={handleAddStaff} className="cursor-pointer">
        Add Staff
      </button>
      <button onClick={handleAddAdmin} className="cursor-pointer">
        Add Admin
      </button>
    </div>
  );
};

export default Delete;
