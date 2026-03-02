import { useState, useEffect } from "react";
import axios from "axios";
import { FaUserShield, FaUserGraduate, FaUser } from "react-icons/fa";
import "../../styles/Members.css";

const Members = () => {
  const [members, setMembers] = useState([]);
  const [counts, setCounts] = useState({
    lecturers: 0,
    tas: 0,
    students: 0,
    total: 0,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const getInitials = (name) => {
    const cleanedName = name
      .replace(/^(dr|eng|prof|mr|mrs|ms)[\.\:\/]?\s+/i, "")
      .trim();

    const words = cleanedName.split(" ").filter(Boolean);

    if (words.length === 0) return "";

    if (words.length === 1) {
      return words[0][0].toUpperCase();
    }

    return (
      words[0][0].toUpperCase() +
      words[words.length - 1][0].toUpperCase()
    );
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);

      const params = {};

      if (search) params.search = search;
      if (roleFilter !== "all") params.role = roleFilter;

      const response = await axios.get("/api/get-members", {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMembers(response.data.members);
      setCounts(response.data.counts);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search, roleFilter]);

  return (
    <div className="members">

      <div className="members-title">
        <h1>Members</h1>
        <div className="total-badge">
          {counts.total} Total
        </div>
      </div>

      {/* Stats Cards */}
      <div className="members-stats">
        <div className="stat-card">
          <div className="stat-header">
            <FaUserShield className="stat-icon lecturer-icon" />
            <p className="lec">Lecturers</p>
          </div>
          <h2>{counts.lecturers}</h2>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <FaUserGraduate className="stat-icon ta-icon" />
            <p className="ta">Teaching Assistants</p>
          </div>
          <h2>{counts.tas}</h2>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <FaUser className="stat-icon student-icon" />
            <p className="student">Students</p>
          </div>
          <h2>{counts.students}</h2>
        </div>
      </div>

      {/* Controls */}
      <div className="members-controls">
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="role-select"
        >
          <option value="all">All Roles</option>
          <option value="lecturer">Lecturer</option>
          <option value="ta">TA</option>
          <option value="student">Student</option>
        </select>
      </div>

      {/* Table */}
      <div className="members-table">

        <div className="table-header">
          <span>NAME</span>
          <span>EMAIL</span>
          <span>ROLE</span>
          <span></span>
        </div>

        {loading ? (
          <p style={{ padding: "20px" }}>Loading...</p>
        ) : (
          members.map((member) => (
            <div key={member.id} className="table-row">

              <div className="member-info">
                <div className="avatar">
                  {getInitials(member.name)}
                </div>
                <span className="member-name">{member.name}</span>
              </div>

              <span className="email">{member.email}</span>

              <span className={`role ${member.role}`}>
                {member.role}
              </span>

              <div className="actions">
                <div className="more-btn">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>

            </div>
          ))
        )}

      </div>
    </div>
  );
};

export default Members;