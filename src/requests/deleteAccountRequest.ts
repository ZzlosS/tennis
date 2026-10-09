export default interface DeleteAccountRequest {
  // Deleting an account asks for the password again.
  password: string;
}
