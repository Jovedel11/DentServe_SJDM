import { adminSupabase } from "@/lib/supabaseSuperAdmin";

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
      phone: "+63994244523",
      user_metadata: {
        user_type: "staff",
        first_name: "Zeus",
        last_name: "Delos Reyes",
        address: "Blk 1 Lt1 V.O Bello Bldg Francisco Homes CSJDM Bulacan",
        clinic_id: "1b4c2533-11f6-4652-87f2-3892b01cc243",
        employee_id: "GSC-103",
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
