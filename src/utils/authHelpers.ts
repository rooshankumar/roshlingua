export async function createUserRecord(userId: string, email: string, fullName: string, age: number | null = null): Promise<boolean> {
  try {
    // Create a profile for the user
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email,
        name: fullName,
        age: age,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating user record:', error);
    return false;
  }
}