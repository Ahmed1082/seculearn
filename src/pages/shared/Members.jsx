import { useState } from "react";
import { FaUserShield, FaUserGraduate, FaUser } from "react-icons/fa";
import "../../styles/Members.css";

const mockMembers = [
  { id: "1", name: "Dr Ahmed Mansour", email: "ahmed@uni.edu", role: "lecturer" },
  { id: "2", name: "Eng Mohamed Samy", email: "mohamed@uni.edu", role: "ta" },
  { id: "3", name: "Ahmed Ali", email: "ahmed@student.edu", role: "student" },
];

const Members = () => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const getInitials = (name) => {
    const ignoreWords = ["dr", "mr", "ms", "mrs", "lecturer", "prof", "eng"];

    const words = name
      .toLowerCase()
      .split(" ")
      .filter((word) => word && !ignoreWords.includes(word));

    if (words.length === 0) return "";
    if (words.length === 1) return words[0][0].toUpperCase();

    return (
      words[0][0].toUpperCase() +
      words[words.length - 1][0].toUpperCase()
    );
  };

  const filtered = mockMembers.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());

    const matchRole = roleFilter === "all" || m.role === roleFilter;

    return matchSearch && matchRole;
  });

  const stats = {
    lecturers: mockMembers.filter((m) => m.role === "lecturer").length,
    tas: mockMembers.filter((m) => m.role === "ta").length,
    students: mockMembers.filter((m) => m.role === "student").length,
  };

  return (
    <div className="members">

      <div className="members-title">
        <h1>Members</h1>
        <div className="total-badge">
          {mockMembers.length} Total
        </div>
      </div>
      {/* Stats Cards */}
      <div className="members-stats">
        <div className="stat-card">
          <div className="stat-header">
            <FaUserShield className="stat-icon lecturer-icon" />
            <p className="lec">Lecturers</p>
          </div>
          <h2>{stats.lecturers}</h2>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <FaUserGraduate className="stat-icon ta-icon" />
            <p className="ta">Teaching Assistants</p>
          </div>
          <h2>{stats.tas}</h2>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <FaUser className="stat-icon student-icon" />
            <p className="student">Students</p>
          </div>
          <h2>{stats.students}</h2>
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

        {filtered.map((member) => (
          <div key={member.id} className="table-row">

            {/* Avatar + Name */}
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

            {/* 3 dots */}
            <div className="actions">
              <div className="more-btn">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

          </div>
        ))}

      </div>

    </div>
  );
};

export default Members;