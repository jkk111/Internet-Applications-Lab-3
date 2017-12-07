let client = require('./');
let fs = require('fs')
let test_path = '/test/__test_file__'
const TEST_TEXT = "TESTING 1234";
const UPDATE_TEST_TEST = "TESTED 1234";

let get_test_file = (file_list) => {
  for(var file of file_list.reverse()) {
    if(file.path === test_path) {
      return file;
    }
  }
  return false;
}

let run = async() => {
  await client.add(test_path, Buffer.from(TEST_TEXT))
  let ls = await client.ls();
  let test_file = get_test_file(ls);

  let file = await client.get(test_file.hash);

  let content =  fs.readFileSync(file, "utf8");
  console.log("Valid file content", content, content === TEST_TEXT)
  console.log(test_file);
  await client.update(test_file.id, UPDATE_TEST_TEST)
  ls = await client.ls();
  console.log(ls);
  test_file = get_test_file(ls);

  file = await client.get(test_file.hash);
  content = fs.readFileSync(file, "utf8");

  console.log("Valid Updated File", content, content === UPDATE_TEST_TEST)
}

run();