import React from "react";

async function ChatToFile({ params: { id } }: { params: { id: string } }) {
  await id;
  return <div>ChatToFile {id}</div>;
}

export default ChatToFile;
