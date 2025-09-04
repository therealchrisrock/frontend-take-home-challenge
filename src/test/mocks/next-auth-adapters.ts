export type Adapter = {
  createUser?: any;
  getUser?: any;
  getUserByEmail?: any;
  getUserByAccount?: any;
  updateUser?: any;
  deleteUser?: any;
  linkAccount?: any;
  unlinkAccount?: any;
  createSession?: any;
  getSessionAndUser?: any;
  updateSession?: any;
  deleteSession?: any;
  createVerificationToken?: any;
  useVerificationToken?: any;
};