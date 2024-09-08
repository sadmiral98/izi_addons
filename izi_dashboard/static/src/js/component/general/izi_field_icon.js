class IZIFieldIcon {
    static map = {
        'boolean': '123',
        'byte': '123',
        'date': 'today',
        'numeric': '123',
        'number': '123',
        'string': 'abc',
        'datetime': 'today',
        'foreignkey': 'link',
    }
    static getIcon(field_type) {
        if (this.map[field_type])
            return this.map[field_type]
        return false
    }
}