export interface CreateStudentRequestBody {
  firstName?: string;
  lastName?: string;
  studentId?: string;
}

export interface RegisterCardRequestBody {
  studentId?: string;
  cardUid?: string;
}
