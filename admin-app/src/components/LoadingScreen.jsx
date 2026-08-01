const LoadingScreen = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-gray-300 border-t-pink-500 rounded-full animate-spin" />
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
