export class Person {
    name: string;
    address: string;
    age: number;
    isMale: boolean;

    static generate(): Person {
        let p = new Person();
        p.name = Person.randomString('jupige');
        p.address = Person.randomString('address');
        p.age = Math.floor(Math.random() * 50);
        p.isMale = Math.random() >= 0.5;

        return p;
    }

    private static randomString(prifix: string) {
        return `${prifix}-${Math.floor(Math.random() * 100)}`;
    }
}