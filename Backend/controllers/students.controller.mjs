export function listStudents({ params, access }) {
  return {
    statusCode: 200,
    body: {
      data: [
        {
          id: "alu-1",
          fullName: "Estudiante de ejemplo",
          schoolId: params.schoolId,
          courseId: params.courseId ?? "cur-1",
          divisionId: params.divisionId ?? "div-a"
        }
      ],
      scope: access.matching
    }
  };
}
