export const CreateLogger = (category) => (message) => {
  console.log(`${new Date().toISOString()} [${category}] ${message}`);
}

export default CreateLogger;
